import { Fair, JobResult } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import prisma from "../prismaClient";
import { notifyWishlistedItems } from "./notifications/wishlistNotifier";
import { ItemWrapper } from "./processors/ItemWrapper";
import {
	NewItemPayload,
	toXmlApiSource,
} from "./processors/NewItemSourceMapper";
import { XML_DIR } from "./updateData";
import { queryWithTimeout } from "./util/helpers";

// Exported for runImportCycle.ts, which interleaves this per-fair as the
// third step (after that fair's own full update and RSS update).
export async function runNewItemsUpdate(fair: Fair, now: number) {
	// Shares Fair.lastResult/startedAt with the other two pipelines' locks,
	// for consistency - a brand-new item has no prior state to diff against,
	// so there's no actual notification race here, but this avoids a
	// special case.
	await prisma.fair.update({
		where: { id: fair.id },
		data: { lastResult: JobResult.RUNNING, startedAt: now },
	});

	try {
		await update(fair, now);
		await prisma.fair.update({
			where: { id: fair.id },
			data: { lastResult: JobResult.SUCCESS },
		});
	} catch (error) {
		await prisma.fair.update({
			where: { id: fair.id },
			data: { lastResult: JobResult.FAILURE },
		});
		console.log(
			`New-items processing for fair ${fair.geeklistId} unsuccessful: ${error}`,
		);
	}
}

async function update(fair: Fair, updateTime: number) {
	const files = listNewItemFiles(fair.geeklistId);
	if (files.length === 0) {
		console.log(`${fair.geeklistId}: New items - no files found.`);
		return;
	}

	const itemIds = [...new Set(files.map((file) => file.itemId))];
	const existing = await prisma.item.findMany({
		where: { id: { in: itemIds } },
		select: { id: true },
	});
	const existingIds = new Set(existing.map((item) => item.id));

	const newFiles = files.filter((file) => !existingIds.has(file.itemId));
	if (newFiles.length === 0) {
		console.log(
			`${fair.geeklistId}: New items - ${files.length} file(s) found, all already known.`,
		);
		return;
	}

	const wrappers: ItemWrapper[] = [];
	for (const file of newFiles) {
		let payload: NewItemPayload;
		try {
			payload = JSON.parse(
				fs.readFileSync(path.join(XML_DIR, file.fileName), "utf-8"),
			);
		} catch (error) {
			console.warn(
				`${fair.geeklistId}: Could not read/parse ${file.fileName}: ${error}`,
			);
			continue;
		}

		const source = toXmlApiSource(payload);
		wrappers.push(
			ItemWrapper.fromXml(
				fair.geeklistId,
				source,
				updateTime,
				fair.eventDate.getFullYear(),
			),
		);
	}

	if (wrappers.length === 0) return;

	const upserts = ItemWrapper.saveAll(wrappers);
	await queryWithTimeout(() => prisma.$transaction(upserts), 30000);

	// Every wrapper here is, by construction, an item that wasn't already in
	// the DB (see the existingIds filter above) - an empty previousState
	// map is correct, not a shortcut: it's what makes findNewlyListedItems
	// (inside notifyWishlistedItems) treat all of them as newly listed. This
	// is the notification the full importer would otherwise have fired for
	// these items, except that by the time it next sees them, they're no
	// longer new from its own previousItemState diff. Best-effort, same as
	// every other notification call in this pipeline.
	await notifyWishlistedItems(wrappers, new Map()).catch((err) =>
		console.error(
			`${fair.geeklistId}: New-item wishlist notification failed:`,
			err,
		),
	);

	console.log(
		`${fair.geeklistId}: New items - ${wrappers.length} new item(s) created from ${files.length} file(s) found.`,
	);
}

type NewItemFile = { itemId: number; fileName: string };

// newitem-{itemId}-{geeklistId}-{timestamp}.json files xml-fetcher writes
// - unlike the rss-page{n}/data files, there's one per *item*, not one
// "latest" per fixed prefix, so this enumerates all of them rather than
// reusing updateData.ts's single-latest-file getLatestXmlFilename.
function listNewItemFiles(geeklistId: number): NewItemFile[] {
	const suffix = `-${geeklistId}-`;
	const files: NewItemFile[] = [];
	for (const file of fs.readdirSync(XML_DIR)) {
		if (!file.startsWith("newitem-") || !file.endsWith(".json")) continue;
		const rest = file.slice("newitem-".length);
		const suffixIndex = rest.indexOf(suffix);
		if (suffixIndex === -1) continue;
		const itemId = Number(rest.slice(0, suffixIndex));
		if (Number.isNaN(itemId)) continue;
		files.push({ itemId, fileName: file });
	}
	return files;
}
