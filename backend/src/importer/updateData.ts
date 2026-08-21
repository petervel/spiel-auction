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

	// Selects any fair where EITHER pass is due and not currently locked -
	// each pass's own due/lock state is then re-checked per fair below,
	// since a fair can match here because only one of the two is due.
	const fairs = await prisma.fair.findMany({
		where: {
			status: FairStatus.ACTIVE,
			OR: [
				{
					lastUpdated: { lt: now - STALE_SECONDS },
					OR: [
						{ lastResult: { not: JobResult.RUNNING } },
						{ startedAt: { lt: now - LOCK_TIMEOUT_SECONDS } },
					],
				},
				{
					itemsLastUpdated: { lt: now - STALE_SECONDS },
					OR: [
						{ itemsLastResult: { not: JobResult.RUNNING } },
						{ itemsStartedAt: { lt: now - LOCK_TIMEOUT_SECONDS } },
					],
				},
			],
		},
	});

	for (const fair of fairs) {
		if (
			isDue(fair.lastUpdated, now) &&
			!isLocked(fair.lastResult, fair.startedAt, now)
		) {
			await runCommentsPass(fair, now);
		}

		if (
			isDue(fair.itemsLastUpdated, now) &&
			!isLocked(fair.itemsLastResult, fair.itemsStartedAt, now)
		) {
			await runItemsPass(fair, now);
		}
	}
	return true;
};

// The ?comments=1 fetch: full item data plus bids/comments. This is the
// unreliable one - BGG regenerates it on any new comment across the whole
// list, which on a busy list can outrun how fast it can finish building.
async function runCommentsPass(fair: Fair, now: number) {
	await prisma.fair.update({
		where: { id: fair.id },
		data: { lastResult: JobResult.RUNNING, startedAt: now },
	});

	const result = await update(fair, now, {
		filePrefix: "data",
		itemsOnly: false,
		previousFile: fair.latestFile,
	});

	if (result.isErr()) {
		await prisma.fair.update({
			where: { id: fair.id },
			data: { lastResult: JobResult.FAILURE },
		});
		console.log(
			`Processing fair ${fair.geeklistId} (comments) unsuccessful: ${result.error}`,
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
	console.log(`"${fair.name}" (comments) successfully updated at ${now}.`);
}

// The plain fetch: item listings only, no comments/bids. Far more reliable
// since it's only invalidated by item edits, not by bid activity - keeps
// listings fresh even while the comments pass is stuck.
async function runItemsPass(fair: Fair, now: number) {
	await prisma.fair.update({
		where: { id: fair.id },
		data: { itemsLastResult: JobResult.RUNNING, itemsStartedAt: now },
	});

	const result = await update(fair, now, {
		filePrefix: "items-data",
		itemsOnly: true,
		previousFile: fair.latestItemsFile,
	});

	if (result.isErr()) {
		await prisma.fair.update({
			where: { id: fair.id },
			data: { itemsLastResult: JobResult.FAILURE },
		});
		console.log(
			`Processing fair ${fair.geeklistId} (items) unsuccessful: ${result.error}`,
		);
		return;
	}

	await prisma.fair.update({
		where: { id: fair.id },
		data: {
			itemsLastUpdated: now,
			itemsLastResult: JobResult.SUCCESS,
			latestItemsFile: result.value.latestFile,
		},
	});

	// Not markDeletedComments here - this pass never sees comments, so
	// their lastSeen is never refreshed by it. Running that check here
	// would mark every comment deleted the moment the (unreliable)
	// comments pass goes stale for over an hour, which is expected to
	// happen regularly - that's the whole reason for this split.
	console.log(`${fair.geeklistId} Marking deleted items...`);
	await markDeletedItems(fair.geeklistId, now);
	console.log(`"${fair.name}" (items) successfully updated at ${now}.`);
}

type PassOptions = {
	filePrefix: string;
	itemsOnly: boolean;
	previousFile: string | null;
};

async function update(fair: Fair, updateTime: number, pass: PassOptions) {
	console.info(`${fair.geeklistId}: Fetching XML (${pass.filePrefix})...`);
	const fileResult = getLatestXmlFilename(pass.filePrefix);
	if (fileResult.isErr()) return fileResult;

	const latestFile = fileResult.value;

	if (pass.previousFile == latestFile) {
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
	const upsertResult = await listWrapper.save({
		itemsOnly: pass.itemsOnly,
	});

	if (upsertResult.isErr()) return upsertResult;

	console.info(
		`${fair.geeklistId}: ${upsertResult.value} upserted successfully from ${latestFile}.`,
	);

	return ok({ latestFile });
}

const XML_DIR = path.join("/app/xml-data");

const getLatestXmlFilename = (filePrefix: string) => {
	const files = fs
		.readdirSync(XML_DIR)
		.filter(
			(file) => file.startsWith(`${filePrefix}-`) && file.endsWith(".xml"),
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
