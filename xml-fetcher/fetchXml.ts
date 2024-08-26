import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as xml2js from "xml2js";

const listId = 339779; // TODO: TEMP HARDCODED
const XML_URL = `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`;
const xmlDir = "/app/data";

// Function to fetch the XML from a remote API
const fetchXML = async (): Promise<string | null> => {
  try {
    const response = await axios.get(XML_URL, {
      responseType: "text", // Ensure the response is treated as a string
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch XML:", error);
    return null;
  }
};

// Function to check if the XML contains the unwanted message
const isValidXML = (xmlContent: string): boolean => {
  const parser = new xml2js.Parser();
  let isValid = true;

  parser.parseString(xmlContent, (err, result) => {
    if (err) {
      console.error("Failed to parse XML:", err);
      isValid = false;
    }

    if (
      result &&
      result.message &&
      result.message.includes(
        "Your request for this geeklist has been accepted"
      )
    ) {
      isValid = false;
    }
  });

  return isValid;
};

// Function to save the XML to a file
const saveXML = (xmlContent: string) => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const fileName = `data-${timestamp}.xml`;
  const filePath = path.join(xmlDir, fileName);

  fs.writeFileSync(filePath, xmlContent);
  console.log(`XML saved successfully: ${fileName}`);
};

// Main function to fetch, validate, and store the XML
const fetchAndStoreXML = async () => {
  const xmlContent = await fetchXML();
  if (xmlContent && isValidXML(xmlContent)) {
    const recentXML = getMostRecentXML();
    if (recentXML !== xmlContent) {
      saveXML(xmlContent);
      cleanupOldFiles(); // Clean up after saving the new file
    } else {
      console.log("XML hasn't changed since last time, skipping.");
    }
  } else {
    console.log("Invalid XML content, skipping save.");
  }
};

// Function to get the most recent XML file content
const getMostRecentXML = (): string | null => {
  const files = fs
    .readdirSync(xmlDir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(xmlDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 0) {
    return fs.readFileSync(path.join(xmlDir, files[0].name), "utf-8");
  }

  return null;
};

const cleanupOldFiles = () => {
  const files = fs
    .readdirSync(xmlDir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(xmlDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time); // Sort by modification time, descending

  // Delete files that are older than the 3 most recent ones
  const filesToDelete = files.slice(3);
  filesToDelete.forEach((file) => {
    const filePath = path.join(xmlDir, file.name);
    fs.unlinkSync(filePath);
    console.log(`Deleted old XML file: ${file.name}`);
  });
};

// Ensure the data directory exists
if (!fs.existsSync(xmlDir)) {
  fs.mkdirSync(xmlDir);
}

// Fetch XML every 30 seconds
const INTERVAL_MS = 30000; // 30 seconds
setInterval(fetchAndStoreXML, INTERVAL_MS);

// Initial fetch
fetchAndStoreXML();
