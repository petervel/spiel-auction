import { Fair, FairStatus, JobResult } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";
import prisma from "../prismaClient";
import { ListWrapper } from "./processors/ListWrapper";
import { Result, err, ok } from "./util/result";

const STALE_SECONDS = 60;
const LOCK_TIMEOUT_SECONDS = 10 * 60;

const isDue = (lastUpdated: number, now: number) =>
	lastUpdated < now - STALE_SECONDS;

const isLocked = (lastResult: JobResult, startedAt: number, now: number) =>
	lastResult === JobResult.RUNNING && startedAt >= now - LOCK_TIMEOUT_SECONDS;

export const updateData = async () => {
	console.log("Update data.");

	const now = Math.floor(Date.now() / 1000);

	const fairs = await prisma.fair.findMany({
		where: {
			status: FairStatus.ACTIVE,
			lastUpdated: { lt: now - STALE_SECONDS },
			OR: [
				{ lastResult: { not: JobResult.RUNNING } },
				{ startedAt: { lt: now - LOCK_TIMEOUT_SECONDS } },
			],
		},
	});

	for (const fair of fairs) {
		if (
			isDue(fair.lastUpdated, now) &&
			!isLocked(fair.lastResult, fair.startedAt, now)
		) {
			await runUpdate(fair, now);
		}
	}
	return true;
};

async function runUpdate(fair: Fair, now: number) {
	await prisma.fair.update({
		where: { id: fair.id },
		data: { lastResult: JobResult.RUNNING, startedAt: now },
	});

	const result = await update(fair, now);

	if (result.isErr()) {
		await prisma.fair.update({
			where: { id: fair.id },
			data: { lastResult: JobResult.FAILURE },
		});
		console.log(
			`Processing fair ${fair.geeklistId} unsuccessful: ${result.error}`,
		);
		return;
	}

	await prisma.fair.update({
		where: { id: fair.id },
		data: {
			lastUpdated: now,
			lastResult: JobResult.SUCCESS,
			latestFile: result.value.latestFile,
		},
	});

	console.log(`${fair.geeklistId} Marking deleted items and comments...`);
	await markDeletedItems(fair.geeklistId, now);
	await markDeletedComments(fair.geeklistId, now);
	console.log(`"${fair.name}" successfully updated at ${now}.`);
}

async function update(fair: Fair, updateTime: number) {
	console.info(`${fair.geeklistId}: Fetching XML...`);
	const fileResult = getLatestXmlFilename("data", fair.geeklistId);
	if (fileResult.isErr()) return fileResult;

	const latestFile = fileResult.value;

	if (fair.latestFile == latestFile) {
		return err("No new XML file, nothing to be done.");
	}

	const loadResult = await getXml(latestFile);
	if (loadResult.isErr()) return loadResult;
	const xmlString = loadResult.value;

	console.info(`${fair.geeklistId}: Parsing XML...`);
	const parseResult = parseXml(fair.id, xmlString);
	if (parseResult.isErr()) return parseResult;
	const object = parseResult.value;

	console.info(`${fair.geeklistId}: Loading auction list object...`);
	const listWrapper = await ListWrapper.fromXml(
		fair.id,
		object,
		updateTime,
		fair.eventDate.getFullYear(),
	);

	console.info(`${fair.geeklistId}: Data loaded. Saving...`);
	const upsertResult = await listWrapper.save();

	if (upsertResult.isErr()) return upsertResult;

	console.info(
		`${fair.geeklistId}: ${upsertResult.value} upserted successfully from ${latestFile}.`,
	);

	return ok({ latestFile });
}

const XML_DIR = path.join("/app/xml-data");

const getLatestXmlFilename = (filePrefix: string, geeklistId: number) => {
	const files = fs
		.readdirSync(XML_DIR)
		.filter(
			(file) =>
				file.startsWith(`${filePrefix}-${geeklistId}-`) &&
				file.endsWith(".xml"),
		);

	if (files.length === 0) {
		return err("No XML files found");
	}

	const latestFile = files.reduce((latest, current) => {
		const latestFileTime = fs.statSync(path.join(XML_DIR, latest)).mtimeMs;
		const currentFileTime = fs.statSync(
			path.join(XML_DIR, current),
		).mtimeMs;
		return currentFileTime > latestFileTime ? current : latest;
	});

	return ok(latestFile);
};

const getXml = async (fileName: string) => {
	try {
		const latestFilePath = path.join(XML_DIR, fileName);
		const xmlContent = fs.readFileSync(latestFilePath, "utf-8");

		return ok(xmlContent);
	} catch (error) {
		return err(`Error reading XML files: ${error}`);
	}
};

type DataObject = Record<string, any>;

const parseXml = (
	fairId: number,
	xmlString: string,
): Result<DataObject, String> => {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const obj = parser.parse(xmlString);
	console.info(`${fairId}: Completed XML parse.`);

	if (obj["message"]) {
		console.log(
			`${fairId}: Geeklist not ready, message from BGG: ${obj["message"]}`,
		);
		return err("not_ready");
	}

	if (!obj["geeklist"]) {
		console.warn(
			`${fairId}: Unexpected response: ${JSON.stringify(obj).substring(0, 500)}`,
		);
		return err("failed");
	}
	return ok(obj["geeklist"]);
};

const markDeletedItems = async (listId: number, now: number) => {
	await prisma.item.updateMany({
		where: {
			listId,
			lastSeen: { lt: now - 3600 },
			deleted: false,
		},
		data: { deleted: true },
	});
};

const markDeletedComments = async (listId: number, now: number) => {
	await prisma.itemComment.updateMany({
		where: {
			listId,
			lastSeen: { lt: now - 3600 },
			deleted: false,
		},
		data: { deleted: true },
	});
};
