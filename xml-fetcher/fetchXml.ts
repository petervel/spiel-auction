import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as xml2js from "xml2js";

const listId = process.env.DEFAULT_GEEKLIST_ID; // TODO: Move this to DB so it can be set in web UI
const BGG_API_TOKEN = process.env.BGG_API_TOKEN;
const xmlDir = "/app/data";

const MIN_INTERVAL_MS = 60_000;    // 1 minute — reset to this on any change
const MAX_INTERVAL_MS = 900_000;   // 15 minutes — ceiling for backoff
const RETRY_INTERVAL_MS = 15_000;  // 15 seconds while waiting for BGG to queue

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
  url: string;
  filePrefix: string;
};

const SOURCES: Source[] = [
  {
    name: "comments",
    url: `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`,
    filePrefix: "data",
  },
  {
    name: "items",
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

const fetchXML = async (source: Source): Promise<string | null> => {
  if (!BGG_API_TOKEN) {
    logError("BGG_API_TOKEN is not set");
    return null;
  }
  try {
    const response = await axios.get(source.url, {
      responseType: "text",
      headers: { Authorization: `Bearer ${BGG_API_TOKEN}` },
    });
    return response.data;
  } catch (error) {
    logError(`[${source.name}] Failed to fetch XML: ${describeError(error)}`);
    return null;
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
  log(`[${source.name}] XML saved successfully: ${fileName}`);
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
      log(`[${source.name}] Deleted old XML file: ${file.name}`);
    });
};

// Returns "changed", "unchanged", "queued", or false on error.
const fetchAndStoreXML = async (
  source: Source,
): Promise<"changed" | "unchanged" | "queued" | false> => {
  const xmlContent = await fetchXML(source);
  if (!xmlContent) return false;

  const status = checkXML(xmlContent);
  if (status === "queued") {
    log(`[${source.name}] BGG is still processing the geeklist, will retry in 15s.`);
    return "queued";
  }
  if (status !== null) {
    log(`[${source.name}] ${status}`);
    return false;
  }

  if (xmlContent === getMostRecentXML(source)) {
    log(`[${source.name}] XML unchanged since last fetch, skipping save.`);
    return "unchanged";
  }

  saveXML(source, xmlContent);
  cleanupOldFiles(source);
  return "changed";
};

const runLoop = async (source: Source) => {
  let interval = MIN_INTERVAL_MS;

  while (true) {
    log(`[${source.name}] Fetching geeklist from BGG...`);
    let result = await fetchAndStoreXML(source);

    // While BGG is queuing our request, poll every 15 seconds.
    while (result === "queued") {
      await sleep(RETRY_INTERVAL_MS);
      result = await fetchAndStoreXML(source);
    }

    if (result === "changed") {
      // Changed: reset backoff to minimum.
      interval = MIN_INTERVAL_MS;
    } else {
      // Unchanged or error: double the interval, capped at maximum.
      interval = Math.min(interval * 2, MAX_INTERVAL_MS);
    }

    log(`[${source.name}] Next fetch in ${interval / 1000}s.`);
    await sleep(interval);
  }
};

const run = () => {
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);

  // Independent loops - a stuck/slow comments fetch must never hold back
  // the reliable items-only one.
  for (const source of SOURCES) {
    runLoop(source);
  }
};

run();
