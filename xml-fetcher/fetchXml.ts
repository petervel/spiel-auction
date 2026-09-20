import axios from "axios";
import * as fs from "fs";
import * as mysql from "mysql2/promise";
import * as path from "path";
import * as xml2js from "xml2js";

const BGG_API_TOKEN = process.env.BGG_API_TOKEN;
const xmlDir = "/app/data";

// Kill switch for the RSS/new-item path - xmlapi is unaffected. For when
// Cloudflare hard-blocks this IP on /rss/ (seen in production).
const RSS_ENABLED = process.env.RSS_ENABLED !== "false";

// Equal on purpose: during high-churn periods most cycles come back
// "changed" and reset straight to this interval, so it's effectively the
// sustained request rate, not just a floor. A production run at 15 minutes
// held for ~8.75 hours with zero 429s (averaging ~8.76 calls/hour), so
// there's headroom to push for more updates/hour - stepping down
// cautiously to 10 minutes rather than jumping straight back toward the
// old 4-minute value that did cause bans.
const MIN_INTERVAL_MS = 600_000;   // 10 minutes — reset to this on any change
const MAX_INTERVAL_MS = 600_000;   // 10 minutes — ceiling for backoff on a benign miss (unchanged/generic error)
// Traced a production run at 30s spacing: every single retry that ever
// succeeded resolved on the 3rd attempt, never the 2nd - so the 2nd attempt
// was consistently too early to matter. Widening to 45s pushes the 3rd
// attempt out to 90s after the first (was 60s), which should catch updates
// that finish resolving a bit later. Added a 4th attempt (135s after the
// first) as extra headroom for stragglers past that.
const RETRY_INTERVAL_MS = 45_000;  // 45 seconds between quick queued-retries - these deliberately skip the global gate below (see runLoop), so this spacing is real, not just a floor

// Traced a production log of 429s: every ban lasted almost exactly 60
// minutes from the first 429 to the first non-429 response after it,
// regardless of how many requests happened during the ban or how long
// the previous backoff had climbed to. It's a fixed-duration lockout, not
// a decaying one - so there's no benefit to escalating further on repeat
// 429s, and no benefit to trying again sooner either. Just wait out the
// known duration.
const RATE_LIMIT_INTERVAL_MS = 3_600_000; // 60 minutes, flat

// "Still processing" means someone changed the list since BGG last built
// it - during high-churn periods (mostly European daytime, since that's
// when bidders are active) it can invalidate faster than BGG can finish
// rebuilding, so continuing to poll every RETRY_INTERVAL_MS indefinitely
// just burns requests chasing a moving target. Try a few times quickly in
// case it settles, then give it real time before trying again.
const QUEUED_RETRY_LIMIT = 4;
const STILL_NOT_READY_INTERVAL_MS = 30 * 60_000; // 30 minutes

// BGG's rate limit is evaluated across the whole app's combined request
// volume (same IP/token), not per-fair or per-endpoint - confirmed this
// session when two sources firing close together both got 429'd, even
// though either alone might have succeeded. Every actual HTTP request,
// regardless of which fair or source it's for, waits out this minimum
// gap since the last request from anywhere before firing.
const MIN_GAP_BETWEEN_REQUESTS_MS = 90_000;
let lastGlobalRequestAt = 0;

const waitForGlobalGap = async () => {
  // Loop rather than a single check-then-sleep: when several callers are
  // all waiting on the same stale lastGlobalRequestAt, they'd otherwise
  // all wake up and fire within milliseconds of each other. Re-checking
  // after every wake-up re-serializes them, since whichever one runs
  // first updates lastGlobalRequestAt before the next one's turn.
  while (true) {
    const wait = MIN_GAP_BETWEEN_REQUESTS_MS - (Date.now() - lastGlobalRequestAt);
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastGlobalRequestAt = Date.now();
};

// RSS is unauthenticated and, per manual testing, notably more tolerant
// than the token-gated xmlapi endpoint above - it gets its own short gate
// so it never has to wait on (or slow down) xmlapi's 90s floor. This is
// just enough to keep one fair's own catch-up pagination from bursting all
// of pages 1-10 in the same instant.
const RSS_MIN_GAP_MS = 1_000;
let lastRssRequestAt = 0;

const waitForRssGap = async () => {
  while (true) {
    const wait = RSS_MIN_GAP_MS - (Date.now() - lastRssRequestAt);
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastRssRequestAt = Date.now();
};

// api.geekdo.com (BGG's own internal JSON API, not the public xmlapi/RSS)
// is a completely separate, undocumented domain - no empirical throttling
// observed, but treat it as unknown and give it its own conservative gate
// rather than assuming it shares either of the above two.
const NEW_ITEM_MIN_GAP_MS = 1_000;
let lastNewItemRequestAt = 0;

const waitForNewItemGap = async () => {
  while (true) {
    const wait = NEW_ITEM_MIN_GAP_MS - (Date.now() - lastNewItemRequestAt);
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastNewItemRequestAt = Date.now();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// docker's own --timestamps flag only shows up when someone remembers to
// pass it, and isn't there at all once logs are piped elsewhere - put the
// timestamp in the message itself so it's always there.
const log = (message: string) =>
  console.log(`[${new Date().toISOString()}] ${message}`);
const logError = (message: string) =>
  console.error(`[${new Date().toISOString()}] ${message}`);

// This used to also fetch the plain (comments-less) XML as a second,
// more-reliable source, on the theory that it'd stay fresh even when the
// ?comments=1 fetch got rate-limited. In practice both sources hit BGG's
// rate limit about equally often, so the second source was just doubling
// request volume without actually buying more reliability - back to a
// single source. The backend's items-only import pass (updateData.ts)
// is left in place but now permanently idle (never gets a items-data-*
// file to import) rather than removed, to keep this a small change.
// "rss" sources (below) are a second, independent tier: the geeklist RSS
// activity feed. It's unauthenticated and - per manual testing - notably
// more tolerant than this token-gated xmlapi endpoint, so it gets its own
// gate/cadence entirely (see waitForRssGap/RSS_INTERVAL_MS) rather than
// sharing xmlapi's tuned-from-bans backoff.
type Source = {
  tier: "xmlapi" | "rss";
  label: string; // for logging - includes the geeklist id, e.g. "comments #319165"
  url: string;
  filePrefix: string;
  geeklistId: number;
};

const sourcesFor = (geeklistId: number): Source[] => [
  {
    tier: "xmlapi",
    label: `comments #${geeklistId}`,
    url: `https://boardgamegeek.com/xmlapi/geeklist/${geeklistId}?comments=1`,
    filePrefix: "data",
    geeklistId,
  },
];

// RSS activity pages are fetched newest-first (page 1 = most recent ~100
// events); this is the ceiling on how far back a single fetch cycle will
// paginate to catch up to the last-seen cursor, covering cold start
// (cursor = 0) and any pathological burst without risking unbounded
// pagination.
const RSS_MAX_PAGES = 10;

const rssSource = (geeklistId: number, page: number): Source => ({
  tier: "rss",
  label: `rss page ${page} #${geeklistId}`,
  url: `https://boardgamegeek.com/rss/geeklist/${geeklistId}?page=${page}&comments=1`,
  filePrefix: `rss-page${page}`,
  geeklistId,
});

// Axios errors carry the full request/response (headers, sockets, retry
// config, ...) - logging one raw drowns the log in noise. Reduce it to the
// status and response body, which is what actually explains the failure
// (e.g. BGG's rate-limit message arrives as a normal response body on a
// 429, not as a distinct error type). A Cloudflare JS-challenge page
// ("Just a moment...") is HTML, not XML - the generic tag-strip below
// removes the <script>/<style> *tags* but leaves their inline CSS/JS
// content behind, which is most of what actually shows up in the log, so
// strip those blocks (tag and content) first, and cap the length as a
// backstop regardless of what kind of error body shows up next.
const describeError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body =
      typeof error.response?.data === "string"
        ? error.response.data
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<\?xml[^>]*\?>/g, "")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300)
        : undefined;
    if (status) return body ? `HTTP ${status}: ${body}` : `HTTP ${status}`;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

// Deliberately NOT setting a spoofed browser User-Agent here. Confirmed by
// direct A/B testing (curl) against boardgamegeek.com: a "real Chrome" UA
// gets a Cloudflare JS challenge (403), while axios's own honest default
// UA ("axios/x.x.x") and no UA at all both get a normal 200. Cloudflare's
// bot detection is evidently flagging the *mismatch* between "claims to be
// Chrome" and the actual TLS/HTTP fingerprint (which obviously isn't real
// Chrome) as more suspicious than a client that isn't pretending to be
// something it's not - so leave every request's headers as axios's own
// defaults unless a specific one (like xmlapi's Authorization) is needed.

type FetchResult =
  | { ok: true; xml: string }
  | { ok: false; rateLimited: boolean };

const fetchXML = async (
  source: Source,
  options?: { skipGlobalGate?: boolean },
): Promise<FetchResult> => {
  // RSS is unauthenticated and doesn't share xmlapi's token requirement or
  // its 90s global gate (see rssSource's comment) - only xmlapi requests go
  // through those.
  if (source.tier === "xmlapi") {
    if (!BGG_API_TOKEN) {
      logError("BGG_API_TOKEN is not set");
      return { ok: false, rateLimited: false };
    }

    // Skipped for quick queued-chase retries (see runLoop) - those are
    // rechecking the same single request in a narrow window, not a fresh
    // request competing with other sources/fairs for the shared budget.
    if (!options?.skipGlobalGate) {
      await waitForGlobalGap();
    }
  }

  log(`[${source.label}] Fetching from BGG...`);

  try {
    const response = await axios.get(source.url, {
      responseType: "text",
      headers:
        source.tier === "xmlapi"
          ? { Authorization: `Bearer ${BGG_API_TOKEN}` }
          : undefined,
    });
    return { ok: true, xml: response.data };
  } catch (error) {
    logError(`[${source.label}] Failed to fetch XML: ${describeError(error)}`);
    const rateLimited =
      axios.isAxiosError(error) && error.response?.status === 429;
    return { ok: false, rateLimited };
  }
};

// Returns null if valid, "queued" if BGG is still processing, or an error string.
const checkXML = (xmlContent: string): null | "queued" | string => {
  const parser = new xml2js.Parser();
  let result: null | "queued" | string = null;

  parser.parseString(xmlContent, (err, parsed) => {
    if (err) {
      result = `Failed to parse XML: ${err}`;
      return;
    }
    if (
      parsed?.message?.includes("Your request for this geeklist has been accepted")
    ) {
      result = "queued";
    }
  });

  return result;
};

// RSS activity entries are newest-first, so the last <item> on a page is
// its oldest. Returns null for an empty/unparseable page (e.g. a page
// number past the end of a small geeklist's activity).
const getOldestPubDateMs = (xmlContent: string): number | null => {
  const parser = new xml2js.Parser();
  let result: number | null = null;

  parser.parseString(xmlContent, (err, parsed) => {
    if (err) return;
    const items = parsed?.rss?.channel?.[0]?.item;
    if (!Array.isArray(items) || items.length === 0) return;
    const pubDate = items[items.length - 1]?.pubDate?.[0];
    if (!pubDate) return;
    const ms = Date.parse(pubDate);
    if (!Number.isNaN(ms)) result = ms;
  });

  return result;
};

const saveXML = (source: Source, xmlContent: string) => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const fileName = `${source.filePrefix}-${source.geeklistId}-${timestamp}.xml`;
  const filePath = path.join(xmlDir, fileName);
  fs.writeFileSync(filePath, xmlContent);
  log(`[${source.label}] XML saved successfully: ${fileName}`);
};

// Filenames include the geeklist id so files from different fairs sharing
// the same prefix (e.g. two "data-*.xml") never get mixed up - both here
// and in the backend's own lookup of the latest file per fair.
const filesFor = (source: Source) =>
  fs
    .readdirSync(xmlDir)
    .filter(
      (file) =>
        file.startsWith(`${source.filePrefix}-${source.geeklistId}-`) &&
        file.endsWith(".xml"),
    )
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(xmlDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

const getMostRecentXML = (source: Source): string | null => {
  const files = filesFor(source);
  return files.length > 0
    ? fs.readFileSync(path.join(xmlDir, files[0].name), "utf-8")
    : null;
};

const cleanupOldFiles = (source: Source) => {
  filesFor(source)
    .slice(3)
    .forEach((file) => {
      fs.unlinkSync(path.join(xmlDir, file.name));
      log(`[${source.label}] Deleted old XML file: ${file.name}`);
    });
};

// Returns "changed", "unchanged", "queued", "rateLimited", or false on a
// non-429 error.
const fetchAndStoreXML = async (
  source: Source,
  options?: { skipGlobalGate?: boolean },
): Promise<"changed" | "unchanged" | "queued" | "rateLimited" | false> => {
  const result = await fetchXML(source, options);
  if (!result.ok) return result.rateLimited ? "rateLimited" : false;
  const xmlContent = result.xml;

  const status = checkXML(xmlContent);
  if (status === "queued") {
    log(
      `[${source.label}] BGG is still processing the geeklist, will retry in ${RETRY_INTERVAL_MS / 1000}s.`,
    );
    return "queued";
  }
  if (status !== null) {
    log(`[${source.label}] ${status}`);
    return false;
  }

  if (xmlContent === getMostRecentXML(source)) {
    log(`[${source.label}] XML unchanged since last fetch, skipping save.`);
    return "unchanged";
  }

  saveXML(source, xmlContent);
  cleanupOldFiles(source);
  return "changed";
};

// A fair's two loops run until its geeklist id drops out of the active
// set (checked once per iteration - no hard cancellation needed, this
// just stops scheduling further fetches for it).
const activeGeeklistIds = new Set<number>();
const runningLoops = new Set<number>();

const runLoop = async (source: Source) => {
  let interval = MIN_INTERVAL_MS;

  while (activeGeeklistIds.has(source.geeklistId)) {
    let result = await fetchAndStoreXML(source);

    // Quickly retry a few times in case the list settles down long enough
    // for BGG to finish rebuilding, without chasing it indefinitely.
    let queuedAttempts = 1;
    while (result === "queued" && queuedAttempts < QUEUED_RETRY_LIMIT) {
      await sleep(RETRY_INTERVAL_MS);
      result = await fetchAndStoreXML(source, { skipGlobalGate: true });
      queuedAttempts++;
    }

    if (result === "changed") {
      // Changed: reset backoff to minimum.
      interval = MIN_INTERVAL_MS;
    } else if (result === "queued") {
      // Still not ready after QUEUED_RETRY_LIMIT quick tries - give the
      // list real time to settle instead of continuing to chase it.
      interval = STILL_NOT_READY_INTERVAL_MS;
    } else if (result === "rateLimited") {
      interval = RATE_LIMIT_INTERVAL_MS;
    } else {
      // Unchanged or a non-429 error: double the interval, capped at maximum.
      interval = Math.min(interval * 2, MAX_INTERVAL_MS);
    }

    log(`[${source.label}] Next fetch in ${interval / 1000}s.`);
    await sleep(interval);
  }

  log(`[${source.label}] Fair no longer active, stopping.`);
  runningLoops.delete(source.geeklistId);
};

// Scans an RSS page's raw XML for "GeekList Item: ... " entries (item
// added/edited - see rssSource's own comment on why RSS can't tell those
// apart) and returns each one's itemid. This is a small, deliberately
// separate scan from checkXML/getOldestPubDateMs above - it doesn't share
// code with the backend's own (more thorough) RssCommentWrapper, since the
// two services are independent yarn projects with no shared package.
const scanForNewItemIds = (xmlContent: string): number[] => {
  const parser = new xml2js.Parser();
  const itemIds: number[] = [];

  parser.parseString(xmlContent, (err, parsed) => {
    if (err) return;
    const items = parsed?.rss?.channel?.[0]?.item;
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const title = item?.title?.[0];
      if (typeof title !== "string" || !title.includes("GeekList Item:")) continue;
      const link = item?.guid?.[0] ?? item?.link?.[0];
      const match = typeof link === "string" ? link.match(/itemid=(\d+)/) : null;
      if (match) itemIds.push(Number(match[1]));
    }
  });

  return itemIds;
};

// geeklistId -> itemids we've already fetched full data for, ever. Seeded
// once per fair (lazily, on first use) from whatever newitem-*.json files
// already exist on the shared volume, then kept in sync in memory - so an
// item only gets fetched once for the life of this process, without
// re-scanning the (growing) shared directory on every single itemid, the
// way a naive per-id fs.readdirSync check would.
//
// The backend deletes a newitem-*.json file once it's consumed it (see
// updateNewItemsData.ts) - that's fine here, since this Set is only ever
// re-seeded from disk once per fair, on this process's first use of it. A
// restart of this process, though, would lose that in-memory state and
// re-seed from whatever files still exist - which, for an item the backend
// already consumed and deleted, means none - so a restart can cause a
// harmless one-off re-fetch of an already-known item (the backend will
// just find it already in the DB and delete the file again). Accepted
// trade-off: restarts are rare, unbounded file growth every cycle isn't.
const knownNewItemIdsByFair = new Map<number, Set<number>>();

const getKnownNewItemIds = (geeklistId: number): Set<number> => {
  let known = knownNewItemIdsByFair.get(geeklistId);
  if (!known) {
    known = new Set<number>();
    const prefix = `newitem-`;
    const suffix = `-${geeklistId}-`;
    for (const file of fs.readdirSync(xmlDir)) {
      if (!file.startsWith(prefix) || !file.endsWith(".json")) continue;
      const rest = file.slice(prefix.length);
      const suffixIndex = rest.indexOf(suffix);
      if (suffixIndex === -1) continue;
      const itemId = Number(rest.slice(0, suffixIndex));
      if (!Number.isNaN(itemId)) known.add(itemId);
    }
    knownNewItemIdsByFair.set(geeklistId, known);
  }
  return known;
};

// geekdo user id -> username, cached for the process's lifetime - repeat
// sellers list many items, no need to re-resolve the same author each time.
const usernameCache = new Map<number, string>();

const resolveUsername = async (authorId: number): Promise<string | null> => {
  const cached = usernameCache.get(authorId);
  if (cached) return cached;

  await waitForNewItemGap();
  try {
    const response = await axios.get(`https://api.geekdo.com/api/user/${authorId}`, {
      responseType: "json",
    });
    const username = response.data?.username;
    if (typeof username !== "string") return null;
    usernameCache.set(authorId, username);
    return username;
  } catch (error) {
    logError(`[newitem] Failed to resolve username for author ${authorId}: ${describeError(error)}`);
    return null;
  }
};

// xmlapi/RSS use the same "boardgame"/"boardgameexpansion"/"boardgameaccessory"
// vocabulary for objectSubtype as BGG's own URL paths do - derive it from
// the leading path segment of the item's href (e.g. "/boardgame/1/foo").
const deriveSubtype = (href: string): string => {
  const match = href.match(/^\/([a-z]+)\//);
  return match ? match[1] : "boardgame";
};

const fetchAndSaveNewItem = async (geeklistId: number, itemId: number) => {
  const known = getKnownNewItemIds(geeklistId);
  if (known.has(itemId)) return;

  await waitForNewItemGap();
  let response;
  try {
    response = await axios.get(`https://api.geekdo.com/api/listitem/${itemId}`, {
      responseType: "json",
    });
  } catch (error) {
    logError(`[newitem #${itemId}] Failed to fetch: ${describeError(error)}`);
    return;
  }

  const data = response.data;
  const authorId = data?.author;
  const username = typeof authorId === "number" ? await resolveUsername(authorId) : null;
  if (!username) {
    logError(`[newitem #${itemId}] Could not resolve author username, will retry next cycle.`);
    return; // no file written yet, so this stays un-known and gets retried
  }

  const payload = {
    itemId,
    objectType: data?.item?.type ?? "thing",
    objectSubtype: deriveSubtype(data?.item?.href ?? ""),
    objectId: Number(data?.item?.id),
    objectName: data?.item?.name,
    username,
    postDate: data?.postdate,
    editDate: data?.editdate,
    imageId: data?.imageid,
    body: data?.body ?? "",
  };

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const fileName = `newitem-${itemId}-${geeklistId}-${timestamp}.json`;
  fs.writeFileSync(path.join(xmlDir, fileName), JSON.stringify(payload));
  known.add(itemId);
  log(`[newitem #${itemId}] Saved "${payload.objectName}" for geeklist #${geeklistId}.`);
};

const RSS_INTERVAL_MS = 60_000; // flat - no backoff/tiering needed, RSS has shown no queued/rate-limit behavior yet

// geeklistId -> ms timestamp to resume after a 429. Never observed on RSS
// in practice, but the xmlapi ban history above is exactly the kind of
// surprise this should guard against.
const rssBackoffUntil = new Map<number, number>();

// Paginates from page 1 forward, stopping only once a page's oldest entry
// is strictly OLDER than the fair's rssLastSeenTimestamp cursor - not
// merely equal to it. pubDate has 1-second resolution, so a burst can put
// several entries on the same second; stopping as soon as a page's oldest
// entry *equals* the cursor risks leaving sibling entries at that exact
// second stranded on the next, unfetched page, and since the importer's
// own "new" filter is a strict >, they'd never be picked up on any later
// cycle either. Pulling one extra page past the equal-timestamp boundary
// is a cheap price for never missing one. RSS_MAX_PAGES is the safety cap
// (cold start, or a pathological burst). A quiet fair costs one page
// fetch; a bursty one pulls as many as it needs to catch up.
const fetchRssPages = async (geeklistId: number, pool: mysql.Pool) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT rssLastSeenTimestamp FROM Fair WHERE geeklistId = ?",
    [geeklistId],
  );
  const cursorSeconds = (rows[0]?.rssLastSeenTimestamp as number) ?? 0;

  let pagesFetched = 0;
  let stopReason = `hit the ${RSS_MAX_PAGES}-page cap`;

  for (let page = 1; page <= RSS_MAX_PAGES; page++) {
    const source = rssSource(geeklistId, page);

    await waitForRssGap();
    const result = await fetchXML(source, { skipGlobalGate: true });
    if (!result.ok) {
      // Back off on any fetch failure, not just a 429 - retrying a 403
      // (e.g. a Cloudflare challenge) every 60s is exactly the kind of
      // pattern that could prolong one, and there's nothing to gain from
      // hammering an endpoint that just failed regardless of why.
      rssBackoffUntil.set(geeklistId, Date.now() + RATE_LIMIT_INTERVAL_MS);
      logError(
        `[${source.label}] Fetch failed${result.rateLimited ? " (rate limited)" : ""}, pausing RSS fetching for #${geeklistId} for ${RATE_LIMIT_INTERVAL_MS / 60000}min.`,
      );
      stopReason = "a fetch error";
      break;
    }

    const status = checkXML(result.xml);
    if (status !== null) {
      log(`[${source.label}] Unexpected response: ${status}`);
      stopReason = "an unexpected response";
      break;
    }

    pagesFetched++;

    if (result.xml !== getMostRecentXML(source)) {
      saveXML(source, result.xml);
      cleanupOldFiles(source);
    }

    for (const itemId of scanForNewItemIds(result.xml)) {
      await fetchAndSaveNewItem(geeklistId, itemId);
    }

    const oldestMs = getOldestPubDateMs(result.xml);
    if (oldestMs === null) {
      stopReason = "an empty/unparseable page";
      break;
    }
    if (Math.floor(oldestMs / 1000) < cursorSeconds) {
      stopReason = "caught up to the cursor";
      break;
    }
  }

  log(`[rss #${geeklistId}] Fetched ${pagesFetched} page(s) this cycle (${stopReason}).`);
};

const runRssLoop = async (geeklistId: number, pool: mysql.Pool) => {
  while (activeGeeklistIds.has(geeklistId)) {
    const backoffUntil = rssBackoffUntil.get(geeklistId) ?? 0;
    if (Date.now() >= backoffUntil) {
      try {
        await fetchRssPages(geeklistId, pool);
      } catch (error) {
        logError(`[rss #${geeklistId}] Unexpected error: ${describeError(error)}`);
      }
    }
    await sleep(RSS_INTERVAL_MS);
  }

  log(`[rss #${geeklistId}] Fair no longer active, stopping.`);
  rssBackoffUntil.delete(geeklistId);
  runningLoops.delete(geeklistId);
};

const startFairLoops = (geeklistId: number, name: string, pool: mysql.Pool) => {
  log(`Starting fetch loops for "${name}" (geeklist #${geeklistId}).`);
  runningLoops.add(geeklistId);
  for (const source of sourcesFor(geeklistId)) {
    runLoop(source);
  }
  if (RSS_ENABLED) {
    runRssLoop(geeklistId, pool);
  } else {
    log(`[rss #${geeklistId}] Disabled (RSS_ENABLED=false), not starting.`);
  }
};

type ActiveFair = { id: number; geeklistId: number; name: string };

const FAIR_REFRESH_INTERVAL_MS = 5 * 60_000; // 5 minutes
const STARTUP_RETRY_INTERVAL_MS = 10_000; // 10 seconds

const reconcileFairs = async (pool: mysql.Pool): Promise<boolean> => {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, geeklistId, name FROM Fair WHERE status = 'ACTIVE'",
    );
    const fairs = rows as unknown as ActiveFair[];

    activeGeeklistIds.clear();
    for (const fair of fairs) activeGeeklistIds.add(fair.geeklistId);

    for (const fair of fairs) {
      if (!runningLoops.has(fair.geeklistId)) {
        startFairLoops(fair.geeklistId, fair.name, pool);
      }
    }
    return true;
  } catch (error) {
    logError(`Failed to load active fairs from the DB: ${describeError(error)}`);
    return false;
  }
};

const run = async () => {
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);

  if (!process.env.DATABASE_URL) {
    logError("DATABASE_URL is not set");
    return;
  }
  const pool = mysql.createPool(process.env.DATABASE_URL);

  // The DB might not be ready to authenticate the instant this container
  // starts, even with a healthcheck-based startup dependency - that only
  // helps if whatever (re)started the container actually respects it,
  // which a plain container restart or a host reboot restarting both
  // containers together doesn't. Retry quickly at boot instead of
  // silently doing nothing until the next FAIR_REFRESH_INTERVAL_MS tick.
  while (!(await reconcileFairs(pool))) {
    log(`Retrying in ${STARTUP_RETRY_INTERVAL_MS / 1000}s...`);
    await sleep(STARTUP_RETRY_INTERVAL_MS);
  }

  setInterval(() => reconcileFairs(pool), FAIR_REFRESH_INTERVAL_MS);
};

run();
