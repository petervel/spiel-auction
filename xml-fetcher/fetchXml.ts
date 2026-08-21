import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as xml2js from "xml2js";

const listId = process.env.DEFAULT_GEEKLIST_ID; // TODO: Move this to DB so it can be set in web UI
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

// Running two sources means two independent loops hitting BGG - without
// this they'd fire in lockstep, doubling the instantaneous burst size
// right when BGG is most likely to rate-limit. Stagger their start so
// requests interleave instead.
const STAGGER_MS = 60_000;

// The stagger above only offsets the very first request - each loop's
// interval then evolves independently (queued-retries, doubling, resets
// on success), so their schedules drift and can converge again later.
// Production logs showed exactly that: both sources firing within
// seconds of each other, both getting 429'd together, even after one had
// just been succeeding fine on its own. Enforce an ongoing minimum gap
// since the OTHER source's most recent request (not just once at
// startup), covering every actual HTTP request including queued-retries.
const MIN_GAP_FROM_OTHER_SOURCE_MS = 90_000;
const lastRequestAt: Record<string, number> = {};

const waitForOtherSourceGap = async (sourceName: string) => {
  const otherAttempts = SOURCES.filter((s) => s.name !== sourceName).map(
    (s) => lastRequestAt[s.name] ?? 0,
  );
  const mostRecentOther = Math.max(0, ...otherAttempts);
  const wait = MIN_GAP_FROM_OTHER_SOURCE_MS - (Date.now() - mostRecentOther);
  if (wait > 0) await sleep(wait);
  lastRequestAt[sourceName] = Date.now();
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
  name: string;
  label: string; // for logging - includes the geeklist id, e.g. "comments #319165"
  url: string;
  filePrefix: string;
};

const SOURCES: Source[] = [
  {
    name: "comments",
    label: `comments #${listId}`,
    url: `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`,
    filePrefix: "data",
  },
  {
    name: "items",
    label: `items #${listId}`,
    url: `https://boardgamegeek.com/xmlapi/geeklist/${listId}`,
    filePrefix: "items-data",
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

  await waitForOtherSourceGap(source.name);

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
  const fileName = `${source.filePrefix}-${timestamp}.xml`;
  const filePath = path.join(xmlDir, fileName);
  fs.writeFileSync(filePath, xmlContent);
  log(`[${source.label}] XML saved successfully: ${fileName}`);
};

const filesFor = (source: Source) =>
  fs
    .readdirSync(xmlDir)
    .filter(
      (file) => file.startsWith(`${source.filePrefix}-`) && file.endsWith(".xml"),
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

const runLoop = async (source: Source, initialDelayMs: number) => {
  if (initialDelayMs > 0) await sleep(initialDelayMs);

  let interval = MIN_INTERVAL_MS;

  while (true) {
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
};

const run = () => {
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);

  // Independent loops - a stuck/slow comments fetch must never hold back
  // the reliable items-only one. Staggered so they don't fire in lockstep.
  SOURCES.forEach((source, index) => {
    runLoop(source, index * STAGGER_MS);
  });
};

run();
