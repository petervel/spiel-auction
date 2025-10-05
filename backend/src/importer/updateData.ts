import { Fair, FairStatus, JobResult } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";
import prisma from "../prismaClient";
import { ListWrapper } from "./processors/ListWrapper";
import { Result, err, ok } from "./util/result";

export const updateData = async () => {
	console.log("Update data.");

	const now = Math.floor(Date.now() / 1000);

	const fairs = await prisma.fair.findMany({
		where: {
			status: FairStatus.ACTIVE,
			OR: [
				{ lastResult: { not: JobResult.RUNNING } },
				{ startedAt: { lt: now - 10 * 60 } }, // 10 minutes
			],
			lastUpdated: { lt: now - 60 },
		},
	});

	for (const fair of fairs) {
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
			return false;
		}

		console.log(`${fair.geeklistId} Marking deleted items...`);
		markDeleted(fair.geeklistId, now);
		console.log(`${fair.listId} Done.`);
	}
	return true;
};

export async function update(fair: Fair, updateTime: number) {
	console.info(`${fair.geeklistId}: Fetching XML... ${fair.geeklistId}`);
	const fileResult = getLatestXmlFilename(fair.geeklistId);
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
	const listWrapper = await ListWrapper.fromXml(fair.id, object, updateTime);

	console.info(`${fair.geeklistId}: Data loaded. Saving...`);
	const upsertResult = await listWrapper.save();

	if (upsertResult.isErr()) return upsertResult;

	console.info(
		`${fair.geeklistId}: ${upsertResult.value} upserted successfully from ${latestFile}.`,
	);
	fair.listId = fair.geeklistId;

	await prisma.fair.update({
		where: { id: fair.id },
		data: {
			lastUpdated: updateTime,
			lastResult: JobResult.SUCCESS,
			latestFile,
		},
	});
	console.log(`"${fair.name}" successfully updated at ${updateTime}.`);

	return ok(fair);
}

const XML_DIR = path.join("/app/xml-data");

const getLatestXmlFilename = (listId: number) => {
	const files = fs
		.readdirSync(XML_DIR)
		.filter((file) => file.endsWith(".xml"));

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
	// const url = `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`;
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

const markDeleted = async (listId: number, now: number) => {
	const hourAgo = now - 3600;

	await prisma.item.updateMany({
		where: {
			listId,
			lastSeen: { lt: hourAgo },
			deleted: false,
		},
		data: { deleted: true },
	});

	await prisma.itemComment.updateMany({
		where: {
			listId,
			lastSeen: { lt: hourAgo },
			deleted: false,
		},
		data: { deleted: true },
	});
};
