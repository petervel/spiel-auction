import axios from "axios";
import * as fs from "fs";
import * as mysql from "mysql2/promise";
import * as path from "path";
import * as xml2js from "xml2js";

const BGG_API_TOKEN = process.env.BGG_API_TOKEN;
const xmlDir = "/app/data";

const MIN_INTERVAL_MS = 240_000;   // 4 minutes — reset to this on any change
const MAX_INTERVAL_MS = 900_000;   // 15 minutes — ceiling for backoff on a benign miss (unchanged/generic error)
const RETRY_INTERVAL_MS = 60_000;  // 60 seconds while waiting for BGG to queue - also keeps a single source from firing twice within the same minute while queued

// A 429 is BGG explicitly saying "slow down", unlike an unchanged/generic
// miss - jump straight to a much larger interval instead of gradually
// doubling up to it, and allow it to climb further/longer than the benign
// ceiling above if it keeps recurring. Production logs showed the 15
// minute ceiling wasn't enough for a sustained rate-limit window to
// actually clear - retries every 15 min just kept getting 429'd for hours.
const RATE_LIMIT_MIN_INTERVAL_MS = 900_000;   // 15 minutes
const RATE_LIMIT_MAX_INTERVAL_MS = 1_800_000; // 30 minutes

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// docker's own --timestamps flag only shows up when someone remembers to
// pass it, and isn't there at all once logs are piped elsewhere - put the
// timestamp in the message itself so it's always there.
const log = (message: string) =>
  console.log(`[${new Date().toISOString()}] ${message}`);
const logError = (message: string) =>
  console.error(`[${new Date().toISOString()}] ${message}`);

// BGG regenerates the geeklist XML on any change since it was last built,
// and the ?comments=1 version gets invalidated by any new bid/comment
// across all ~15k items - on a busy list that can churn faster than BGG
// can finish generating it, so that fetch may never land. The plain
// version only gets invalidated by item edits, which are far rarer, so
// it succeeds far more reliably. Fetch both independently: the reliable
// one keeps item listings fresh, the unreliable one is still the only
// source of bid data, whenever it does land.
type Source = {
  name: "comments" | "items";
  label: string; // for logging - includes the geeklist id, e.g. "comments #319165"
  url: string;
  filePrefix: string;
  geeklistId: number;
};

const sourcesFor = (geeklistId: number): Source[] => [
  {
    name: "comments",
    label: `comments #${geeklistId}`,
    url: `https://boardgamegeek.com/xmlapi/geeklist/${geeklistId}?comments=1`,
    filePrefix: "data",
    geeklistId,
  },
  {
    name: "items",
    label: `items #${geeklistId}`,
    url: `https://boardgamegeek.com/xmlapi/geeklist/${geeklistId}`,
    filePrefix: "items-data",
    geeklistId,
  },
];

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

const fetchXML = async (source: Source): Promise<FetchResult> => {
  if (!BGG_API_TOKEN) {
    logError("BGG_API_TOKEN is not set");
    return { ok: false, rateLimited: false };
  }

  await waitForGlobalGap();

  try {
    const response = await axios.get(source.url, {
      responseType: "text",
      headers: { Authorization: `Bearer ${BGG_API_TOKEN}` },
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
): Promise<"changed" | "unchanged" | "queued" | "rateLimited" | false> => {
  const result = await fetchXML(source);
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
    log(`[${source.label}] Fetching geeklist from BGG...`);
    let result = await fetchAndStoreXML(source);

    // While BGG is queuing our request, poll every RETRY_INTERVAL_MS.
    while (result === "queued") {
      await sleep(RETRY_INTERVAL_MS);
      result = await fetchAndStoreXML(source);
    }

    if (result === "changed") {
      // Changed: reset backoff to minimum.
      interval = MIN_INTERVAL_MS;
    } else if (result === "rateLimited") {
      // Jump straight to a much larger interval rather than gradually
      // doubling up to it, and let it climb higher/longer than the
      // benign ceiling if 429s keep recurring.
      interval = Math.min(
        Math.max(interval * 2, RATE_LIMIT_MIN_INTERVAL_MS),
        RATE_LIMIT_MAX_INTERVAL_MS,
      );
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

const startFairLoops = (geeklistId: number, name: string) => {
  log(`Starting fetch loops for "${name}" (geeklist #${geeklistId}).`);
  runningLoops.add(geeklistId);
  for (const source of sourcesFor(geeklistId)) {
    runLoop(source);
  }
};

type ActiveFair = { id: number; geeklistId: number; name: string };

const FAIR_REFRESH_INTERVAL_MS = 5 * 60_000; // 5 minutes

const reconcileFairs = async (pool: mysql.Pool) => {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, geeklistId, name FROM Fair WHERE status = 'ACTIVE'",
    );
    const fairs = rows as unknown as ActiveFair[];

    activeGeeklistIds.clear();
    for (const fair of fairs) activeGeeklistIds.add(fair.geeklistId);

    for (const fair of fairs) {
      if (!runningLoops.has(fair.geeklistId)) {
        startFairLoops(fair.geeklistId, fair.name);
      }
    }
  } catch (error) {
    logError(`Failed to load active fairs from the DB: ${describeError(error)}`);
  }
};

const run = async () => {
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);

  if (!process.env.DATABASE_URL) {
    logError("DATABASE_URL is not set");
    return;
  }
  const pool = mysql.createPool(process.env.DATABASE_URL);

  await reconcileFairs(pool);
  setInterval(() => reconcileFairs(pool), FAIR_REFRESH_INTERVAL_MS);
};

run();
