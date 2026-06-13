import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as xml2js from "xml2js";

const listId = process.env.DEFAULT_GEEKLIST_ID; // TODO: Move this to DB so it can be set in web UI
const BGG_API_TOKEN = process.env.BGG_API_TOKEN;
const XML_URL = `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`;
const xmlDir = "/app/data";

const MIN_INTERVAL_MS = 60_000;    // 1 minute — reset to this on any change
const MAX_INTERVAL_MS = 900_000;   // 15 minutes — ceiling for backoff
const RETRY_INTERVAL_MS = 15_000;  // 15 seconds while waiting for BGG to queue

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchXML = async (): Promise<string | null> => {
  if (!BGG_API_TOKEN) {
    console.error("BGG_API_TOKEN is not set");
    return null;
  }
  try {
    const response = await axios.get(XML_URL, {
      responseType: "text",
      headers: { Authorization: `Bearer ${BGG_API_TOKEN}` },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch XML:", error);
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

const saveXML = (xmlContent: string) => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const fileName = `data-${timestamp}.xml`;
  const filePath = path.join(xmlDir, fileName);
  fs.writeFileSync(filePath, xmlContent);
  console.log(`XML saved successfully: ${fileName}`);
};

const getMostRecentXML = (): string | null => {
  const files = fs
    .readdirSync(xmlDir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(xmlDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0
    ? fs.readFileSync(path.join(xmlDir, files[0].name), "utf-8")
    : null;
};

const cleanupOldFiles = () => {
  const files = fs
    .readdirSync(xmlDir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(xmlDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  files.slice(3).forEach((file) => {
    fs.unlinkSync(path.join(xmlDir, file.name));
    console.log(`Deleted old XML file: ${file.name}`);
  });
};

// Returns "changed", "unchanged", "queued", or false on error.
const fetchAndStoreXML = async (): Promise<"changed" | "unchanged" | "queued" | false> => {
  const xmlContent = await fetchXML();
  if (!xmlContent) return false;

  const status = checkXML(xmlContent);
  if (status === "queued") {
    console.log("BGG is still processing the geeklist, will retry in 15s.");
    return "queued";
  }
  if (status !== null) {
    console.log(status);
    return false;
  }

  if (xmlContent === getMostRecentXML()) {
    console.log("XML unchanged since last fetch, skipping save.");
    return "unchanged";
  }

  saveXML(xmlContent);
  cleanupOldFiles();
  return "changed";
};

const run = async () => {
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);

  let interval = MIN_INTERVAL_MS;

  while (true) {
    console.log("Fetching geeklist from BGG...");
    let result = await fetchAndStoreXML();

    // While BGG is queuing our request, poll every 15 seconds.
    while (result === "queued") {
      await sleep(RETRY_INTERVAL_MS);
      result = await fetchAndStoreXML();
    }

    if (result === "changed") {
      // Changed: reset backoff to minimum.
      interval = MIN_INTERVAL_MS;
    } else {
      // Unchanged or error: double the interval, capped at maximum.
      interval = Math.min(interval * 2, MAX_INTERVAL_MS);
    }

    console.log(`Next fetch in ${interval / 1000}s.`);
    await sleep(interval);
  }
};

run();
