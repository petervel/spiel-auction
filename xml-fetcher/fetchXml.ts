import axios from "axios";
import * as fs from "fs";
import * as mysql from "mysql2/promise";
import * as path from "path";
import * as xml2js from "xml2js";

const BGG_API_TOKEN = process.env.BGG_API_TOKEN;
const xmlDir = "/app/data";

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
// 429, not as a distinct error type).
const describeError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body =
      typeof error.response?.data === "string"
        ? error.response.data
            .replace(/<\?xml[^>]*\?>/g, "")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : undefined;
    if (status) return body ? `HTTP ${status}: ${body}` : `HTTP ${status}`;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

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

const RSS_INTERVAL_MS = 60_000; // flat - no backoff/tiering needed, RSS has shown no queued/rate-limit behavior yet

// geeklistId -> ms timestamp to resume after a 429. Never observed on RSS
// in practice, but the xmlapi ban history above is exactly the kind of
// surprise this should guard against.
const rssBackoffUntil = new Map<number, number>();

// Paginates from page 1 forward, stopping as soon as a page's oldest entry
// is at or before the fair's rssLastSeenTimestamp cursor (i.e. we've now
// covered everything newer than what the importer last processed), or the
// RSS_MAX_PAGES safety cap is hit. A quiet fair costs one page fetch; a
// bursty one pulls as many as it needs to catch up.
const fetchRssPages = async (geeklistId: number, pool: mysql.Pool) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT rssLastSeenTimestamp FROM Fair WHERE geeklistId = ?",
    [geeklistId],
  );
  const cursorSeconds = (rows[0]?.rssLastSeenTimestamp as number) ?? 0;

  for (let page = 1; page <= RSS_MAX_PAGES; page++) {
    const source = rssSource(geeklistId, page);

    await waitForRssGap();
    const result = await fetchXML(source, { skipGlobalGate: true });
    if (!result.ok) {
      if (result.rateLimited) {
        rssBackoffUntil.set(geeklistId, Date.now() + RATE_LIMIT_INTERVAL_MS);
        logError(
          `[${source.label}] Rate limited, pausing RSS fetching for #${geeklistId} for ${RATE_LIMIT_INTERVAL_MS / 60000}min.`,
        );
      }
      return;
    }

    const status = checkXML(result.xml);
    if (status !== null) {
      log(`[${source.label}] Unexpected response: ${status}`);
      return;
    }

    if (result.xml !== getMostRecentXML(source)) {
      saveXML(source, result.xml);
      cleanupOldFiles(source);
    }

    const oldestMs = getOldestPubDateMs(result.xml);
    if (oldestMs === null) return; // empty/unparseable page - nothing further to chase
    if (Math.floor(oldestMs / 1000) <= cursorSeconds) return; // caught up to the cursor
  }
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
  runRssLoop(geeklistId, pool);
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
