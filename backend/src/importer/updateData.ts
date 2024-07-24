import { Fair } from "@prisma/client";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import prisma from "../prismaClient";
import { ListWrapper } from "./processors/ListWrapper";
import { Result, err, ok } from "./util/result";

export const updateData = async () => {
	console.log("Update data");

	const updateTime = Math.floor(Date.now() / 1000);

	const fairs = await prisma.fair.findMany({
		where: { status: "ACTIVE", lastUpdated: { lt: updateTime - 5 * 60 } },
	});

	for (const fair of fairs) {
		const result = await update(fair, updateTime);
		if (result.isOk()) {
			await prisma.fair.update({
				where: { id: fair.id },
				data: { lastUpdated: updateTime },
			});
			console.log(
				`"${fair.name}" successfully updated at ${updateTime}.`,
			);
		} else {
			console.log(
				`Processing fair ${fair.id} unsuccessful: ${result.error}`,
			);
			return false;
		}
	}
	return true;
};

export async function update(fair: Fair, updateTime: number) {
	console.info(`${fair.id}: Fetching XML... ${fair.geeklistId}`);
	const xmlString = await getXml(fair.geeklistId);

	console.info(`${fair.id}: Parsing XML...`);
	const parseResult = parseXml(fair.id, xmlString);
	if (parseResult.isErr()) return parseResult;
	const object = parseResult.value;

	console.info(`${fair.id}: Loading auction list object...`);
	const listWrapper = await ListWrapper.fromXml(fair.id, object, updateTime);

	console.info(`${fair.id}: Data loaded. Saving...`);
	const upsertResult = await listWrapper.save();

	if (upsertResult.isErr()) return upsertResult;

	console.info(`${fair.id}: ${upsertResult.value} upserted successfully.`);
	fair.listId = fair.geeklistId;

	console.log("done.");

	return ok(fair);
}

async function getXml(listId: number) {
	const url = `https://boardgamegeek.com/xmlapi/geeklist/${listId}?comments=1`;
	console.info(`fetching xml from ${url}`);
	const { data } = await axios.get(url);
	return data;
}

type DataObject = Record<string, any>;

function parseXml(
	fairId: number,
	xmlString: string,
): Result<DataObject, String> {
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
}
