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

// Production held 15min intervals for 8.75h with zero 429s - 10min is a
// conservative step down from that, not back to the old 4min that banned us.
const MIN_INTERVAL_MS = 600_000;   // 10 minutes — reset to this on any change
const MAX_INTERVAL_MS = 600_000;   // 10 minutes — ceiling for backoff on a benign miss (unchanged/generic error)
// Production trace: successful retries always resolved on the 3rd attempt,
// never the 2nd - 45s spacing pushes that out to 90s (4th at 135s for stragglers).
const RETRY_INTERVAL_MS = 45_000;  // between quick queued-retries; skips the global gate below (see runLoop)

// Production 429s traced at a flat ~60min lockout regardless of retry
// count - no benefit to escalating or retrying sooner.
const RATE_LIMIT_INTERVAL_MS = 3_600_000; // 60 minutes, flat

// A few quick retries in case the list settles, then back off for real
// instead of burning requests chasing a moving target.
const QUEUED_RETRY_LIMIT = 4;
const STILL_NOT_READY_INTERVAL_MS = 30 * 60_000; // 30 minutes

// BGG's rate limit applies across the whole app's request volume, not per-
// fair/endpoint (confirmed: two sources firing close together both got 429'd).
const MIN_GAP_BETWEEN_REQUESTS_MS = 90_000;
let lastGlobalRequestAt = 0;

const waitForGlobalGap = async () => {
  // Loop, not check-then-sleep, so concurrent callers re-serialize instead
  // of all waking at once.
  while (true) {
    const wait = MIN_GAP_BETWEEN_REQUESTS_MS - (Date.now() - lastGlobalRequestAt);
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastGlobalRequestAt = Date.now();
};

// RSS is unauthenticated and more tolerant than xmlapi - own short gate,
// independent of xmlapi's 90s floor, just enough to avoid bursting pages 1-10.
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

// api.geekdo.com is a separate, undocumented domain - own conservative
// gate, not assumed to share either of the above.
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

// Timestamp in the message itself - docker's --timestamps flag isn't
// always there once logs are piped elsewhere.
const log = (message: string) =>
  console.log(`[${new Date().toISOString()}] ${message}`);
const logError = (message: string) =>
  console.error(`[${new Date().toISOString()}] ${message}`);

// Used to also fetch a plain (comments-less) XML as backup, but it hit
// rate limits equally often - removed. Backend's items-only import pass
// left idle rather than deleted.
// "rss" is a second, independent tier (the geeklist RSS feed) - unauthenticated,
// more tolerant, own gate/cadence (see waitForRssGap/RSS_INTERVAL_MS).
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

// Ceiling on how deep one cycle paginates to catch the last-seen cursor -
// covers cold start (cursor = 0) and any pathological burst.
const RSS_MAX_PAGES = 10;

const rssSource = (geeklistId: number, page: number): Source => ({
  tier: "rss",
  label: `rss page ${page} #${geeklistId}`,
  url: `https://boardgamegeek.com/rss/geeklist/${geeklistId}?page=${page}&comments=1`,
  filePrefix: `rss-page${page}`,
  geeklistId,
});

// Reduce an axios error to status + body (raw errors are mostly noise).
// Strip <script>/<style> blocks first - Cloudflare's challenge page is
// HTML, and the generic tag-strip below would otherwise leave their inline
// CSS/JS content behind. Cap the length as a backstop either way.
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

// No spoofed User-Agent: confirmed via curl that a "real Chrome" UA gets a
// Cloudflare 403 while axios's honest default UA gets 200 - the fingerprint
// mismatch is what's flagged, not looking like a bot.

type FetchResult =
  | { ok: true; xml: string }
  | { ok: false; rateLimited: boolean };

const fetchXML = async (
  source: Source,
  options?: { skipGlobalGate?: boolean },
): Promise<FetchResult> => {
  // Only xmlapi needs the token/global gate - RSS is unauthenticated and
  // has its own gate.
  if (source.tier === "xmlapi") {
    if (!BGG_API_TOKEN) {
      logError("BGG_API_TOKEN is not set");
      return { ok: false, rateLimited: false };
    }

    // Skipped for quick queued-chase retries (see runLoop) - same request,
    // not a fresh one competing for the shared budget.
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

// Entries are newest-first, so the last <item> on a page is oldest. Null
// for an empty/unparseable page.
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

// Filenames include the geeklist id so same-prefix files across fairs
// never get mixed up (also relied on by the backend's own lookup).
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

// A fair's loops run until its geeklist id drops out of the active set -
// checked once per iteration, no hard cancellation needed.
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

// Scans an RSS page for "GeekList Item: ..." (added/edited) entries and
// returns their itemids - separate from the backend's RssCommentWrapper
// since these are independent projects with no shared code.
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

// geeklistId -> itemids already fetched, ever - seeded once from disk per
// fair, then kept in memory to avoid re-scanning it per item. A restart
// can cause one harmless re-fetch of an already-consumed item.
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

// geekdo user id -> username, cached for the process's life - repeat
// sellers list many items.
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

// Derives objectSubtype from the item href's leading path segment (e.g.
// "/boardgame/1/foo") - same vocabulary xmlapi uses.
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

// geeklistId -> ms timestamp to resume after a failure (see fetchRssPages).
const rssBackoffUntil = new Map<number, number>();

// Paginates until a page's oldest entry is strictly older than the cursor,
// not just equal - pubDate has 1s resolution, so same-second entries could
// otherwise get stranded on an unfetched page and never picked up (the
// importer's own filter is a strict >). Capped at RSS_MAX_PAGES.
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
      // Back off on any failure, not just 429 - retrying a 403 every 60s
      // could prolong a Cloudflare-style block.
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

  // A healthcheck dependency doesn't help on a plain restart/reboot -
  // retry quickly at boot instead of waiting for the next refresh tick.
  while (!(await reconcileFairs(pool))) {
    log(`Retrying in ${STARTUP_RETRY_INTERVAL_MS / 1000}s...`);
    await sleep(STARTUP_RETRY_INTERVAL_MS);
  }

  setInterval(() => reconcileFairs(pool), FAIR_REFRESH_INTERVAL_MS);
};

run();
