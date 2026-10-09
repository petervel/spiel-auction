// One-off backfill: re-fetches BGG's primary/sort name for every existing
// BggObject row and corrects it where it differs. Needed because objects
// created via the single-object "add to wishlist" route (see
// src/api/wishlist/index.ts) used to take their name from whatever a
// geeklist auction posting called the item, which can be a translated or
// stylized title instead of BGG's canonical name - that route now calls
// BGG itself for new objects, but this backfills the rows it already got
// wrong.
//
// Deliberately self-contained (doesn't import from ../bggCollection) so
// running it is just: copy this one file into the container, run it,
// delete it - no need to touch any other file the live service depends on.
//
// Usage (from inside the backend container):
//   npx ts-node src/scripts/backfillBggObjectNames.ts
//
// Batches ids into one /xmlapi2/thing request each (BGG's thing endpoint
// accepts a comma-separated id list) rather than one request per object -
// with thousands of existing rows, one-at-a-time would mean thousands of
// requests against the same BGG host xml-fetcher polls from, risking the
// kind of rate-limit ban noted in CLAUDE.md.
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { decode } from "html-entities";
import prisma from "../prismaClient";

const BATCH_SIZE = 20;
const DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = <T>(items: T[], size: number): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
};

const fetchPrimaryNames = async (
	objectIds: number[],
): Promise<Map<number, string>> => {
	const result = new Map<number, string>();

	try {
		const url = `https://boardgamegeek.com/xmlapi2/thing?id=${objectIds.join(",")}`;
		const response = await axios.get(url, {
			responseType: "text",
			validateStatus: () => true,
			headers: { Authorization: `Bearer ${process.env.BGG_API_TOKEN}` },
		});

		if (response.status !== 200) return result;

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "@_",
		});
		const rawItems = parser.parse(response.data)?.items?.item;
		if (!rawItems) return result;

		const items = Array.isArray(rawItems) ? rawItems : [rawItems];
		for (const item of items) {
			const id = Number(item["@_id"]);
			const names = Array.isArray(item.name) ? item.name : [item.name];
			const primary = names.find((n: any) => n?.["@_type"] === "primary");
			const value = (primary ?? names[0])?.["@_value"];
			if (id && value) result.set(id, decode(String(value)));
		}
	} catch {
		// leave whatever was already resolved before the failure
	}

	return result;
};

const run = async () => {
	const objects = await prisma.bggObject.findMany({
		orderBy: { objectId: "asc" },
	});

	const batches = chunk(objects, BATCH_SIZE);
	console.log(
		`Checking ${objects.length} BggObject rows in ${batches.length} batches of up to ${BATCH_SIZE}...`,
	);

	let updated = 0;
	let unchanged = 0;
	let failed = 0;

	for (const [index, batch] of batches.entries()) {
		const primaryNames = await fetchPrimaryNames(
			batch.map((object) => object.objectId),
		);

		for (const object of batch) {
			const primaryName = primaryNames.get(object.objectId);

			if (!primaryName) {
				console.log(`  [FAILED] ${object.objectId}: ${object.objectName}`);
				failed++;
			} else if (primaryName !== object.objectName) {
				await prisma.bggObject.update({
					where: { objectId: object.objectId },
					data: { objectName: primaryName },
				});
				console.log(
					`  [UPDATED] ${object.objectId}: "${object.objectName}" -> "${primaryName}"`,
				);
				updated++;
			} else {
				unchanged++;
			}
		}

		console.log(`Batch ${index + 1}/${batches.length} done.`);
		if (index < batches.length - 1) await sleep(DELAY_MS);
	}

	console.log(
		`Done. ${updated} updated, ${unchanged} unchanged, ${failed} failed.`,
	);
};

run()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
