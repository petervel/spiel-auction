import { Fair, Item, JobResult } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import prisma from "../prismaClient";
import { getBidderKeys, likeItemsForNewBidders } from "./likedItems";
import { notifyBidUpdates } from "./notifications/outbidNotifier";
import { ItemCommentWrapper } from "./processors/ItemCommentWrapper";
import { ItemWrapper } from "./processors/ItemWrapper";
import { parseRssPage, RssActivityEntry } from "./processors/RssCommentWrapper";
import { getLatestXmlFilename, getXml } from "./updateData";
import {
	formatTimeToDate,
	IMPORT_BATCH_SIZE,
	queryWithTimeout,
} from "./util/helpers";

// Same ceiling as xml-fetcher's own RSS_MAX_PAGES (kept as a separate
// constant - the two are independent processes/services, not a shared
// package): a fair's activity almost never needs more than page 1, this
// just bounds how many page files we'll ever scan in one cycle.
const RSS_MAX_PAGES = 10;

// Exported for runImportCycle.ts, which interleaves this per-fair (right
// after that fair's own full update, if one ran) rather than looping all
// fairs' RSS updates as a separate pass.
export async function runRssUpdate(fair: Fair, now: number) {
	// Shares Fair.lastResult/startedAt with updateData.ts's own lock - see
	// the plan/schema comment on rssLastSeenTimestamp for why: it's what
	// keeps this job and the full importer from ever computing/firing the
	// same bid/outbid/won notification for the same fair concurrently.
	await prisma.fair.update({
		where: { id: fair.id },
		data: { lastResult: JobResult.RUNNING, startedAt: now },
	});

	try {
		const rssLastSeenTimestamp = await update(fair, now);
		await prisma.fair.update({
			where: { id: fair.id },
			data: {
				lastResult: JobResult.SUCCESS,
				...(rssLastSeenTimestamp !== null
					? { rssLastSeenTimestamp }
					: {}),
			},
		});
	} catch (error) {
		await prisma.fair.update({
			where: { id: fair.id },
			data: { lastResult: JobResult.FAILURE },
		});
		console.log(
			`RSS processing for fair ${fair.geeklistId} unsuccessful: ${error}`,
		);
	}
}

// Returns the new rssLastSeenTimestamp to advance to, or null if there was
// nothing on disk yet to process (e.g. xml-fetcher hasn't written a first
// RSS page for this fair yet) - a no-op, not a failure.
async function update(fair: Fair, updateTime: number): Promise<number | null> {
	const entries = await loadRssEntries(fair.geeklistId);
	if (entries.length === 0) return null;

	const maxPubDateSeconds = Math.max(
		fair.rssLastSeenTimestamp,
		...entries.map((entry) => entry.pubDateSeconds),
	);

	const newCommentEntries = entries.filter(
		(
			entry,
		): entry is RssActivityEntry & {
			itemId: number;
			source: Record<string, any>;
		} =>
			entry.itemId !== null &&
			entry.source !== null &&
			entry.pubDateSeconds > fair.rssLastSeenTimestamp,
	);

	if (newCommentEntries.length === 0) {
		return maxPubDateSeconds;
	}

	// RSS can't originate new items (no body text, see the plan) - only
	// entries for items the xmlapi importer already created are usable.
	const itemIds = [
		...new Set(newCommentEntries.map((entry) => entry.itemId)),
	];
	const items = await prisma.item.findMany({
		where: { id: { in: itemIds }, listId: fair.geeklistId, deleted: false },
	});
	const itemById = new Map(items.map((item) => [item.id, item]));

	const newWrappersByItemId = new Map<number, ItemCommentWrapper[]>();
	for (const entry of newCommentEntries) {
		const item = itemById.get(entry.itemId);
		if (!item) continue;

		const wrapper = ItemCommentWrapper.fromXml(
			item,
			entry.source,
			updateTime,
		);
		const existing = newWrappersByItemId.get(item.id) ?? [];
		existing.push(wrapper);
		newWrappersByItemId.set(item.id, existing);
	}

	if (newWrappersByItemId.size === 0) {
		return maxPubDateSeconds;
	}

	// Snapshot per-bidder state before any writes this cycle, for the
	// auto-like-on-first-bid side effect below.
	const previousBidderKeys = await getBidderKeys(fair.geeklistId);

	const previousItemState = new Map<
		number,
		{ currentBid: number | null; isEnded: boolean }
	>();
	const itemWrappers: ItemWrapper[] = [];
	const updatedItems: Item[] = [];
	const commentUpserts = [];

	for (const [itemId, newWrappers] of newWrappersByItemId) {
		const item = itemById.get(itemId)!;
		previousItemState.set(item.id, {
			currentBid: item.currentBid,
			isEnded: item.isEnded,
		});

		const existingComments = await prisma.itemComment.findMany({
			where: { itemId: item.id, bid: { not: null } },
		});
		const mergedComments = [
			...existingComments.map(
				(comment) => new ItemCommentWrapper(comment),
			),
			...newWrappers,
		];

		const { highestBid, highestBidder } =
			ItemCommentWrapper.getHighestBid(mergedComments);
		const currentBid = highestBid ?? item.currentBid ?? 0;
		const hasBids = !!highestBidder;

		// isSold/isEnded, recomputed the same way ItemWrapper.getDerivedData
		// does, but only from fields already on the Item row (binPrice,
		// auctionEndDate) rather than a fresh body parse - see the plan.
		// OR-ing in item.isEnded makes this monotonic: RSS can only ever
		// push an item from not-ended to ended, never revert a
		// strikethrough-based ending the last xmlapi cycle detected (that
		// case has no signal here at all, since it needs fresh body text).
		const isSold = hasBids && currentBid === item.binPrice;
		const isEnded =
			item.isEnded ||
			isSold ||
			(!!item.auctionEndDate && item.auctionEndDate < formatTimeToDate());

		const updatedItem: Item = {
			...item,
			currentBid,
			highestBidder,
			hasBids,
			isSold,
			isEnded,
			lastSeen: updateTime,
		};

		itemWrappers.push(new ItemWrapper(updatedItem, mergedComments));
		updatedItems.push(updatedItem);
		commentUpserts.push(...ItemCommentWrapper.saveAll(newWrappers));
	}

	const itemUpdates = updatedItems.map((updatedItem) =>
		prisma.item.update({
			where: { id: updatedItem.id },
			data: {
				currentBid: updatedItem.currentBid,
				highestBidder: updatedItem.highestBidder,
				hasBids: updatedItem.hasBids,
				isSold: updatedItem.isSold,
				isEnded: updatedItem.isEnded,
				lastSeen: updatedItem.lastSeen,
			},
		}),
	);

	// Batched the same way ListWrapper.save() is, guarding against the same
	// Prisma array-transaction 5s timeout under the mariadb driver adapter -
	// RSS batches are normally tiny, but a mega-burst catch-up pass across
	// many pages could touch enough items to matter.
	const upserts = [...commentUpserts, ...itemUpdates];
	for (let offset = 0; offset < upserts.length; offset += IMPORT_BATCH_SIZE) {
		const batch = upserts.slice(offset, offset + IMPORT_BATCH_SIZE);
		await queryWithTimeout(() => prisma.$transaction(batch), 30000);
	}

	// Best-effort - a push-sending bug should never turn a successful
	// import into a failure. "won" fires correctly here too since isEnded/
	// isSold were already recomputed above - see the plan's note on why
	// this can't double-fire once the xmlapi cycle runs next.
	await notifyBidUpdates(itemWrappers, previousItemState).catch((err) =>
		console.error(`${fair.geeklistId}: RSS push notification failed:`, err),
	);

	await likeItemsForNewBidders(
		fair.id,
		fair.geeklistId,
		previousBidderKeys,
	).catch((err) =>
		console.error(
			`${fair.geeklistId}: RSS auto-like for new bidders failed:`,
			err,
		),
	);

	return maxPubDateSeconds;
}

// Scans rss-page{1..RSS_MAX_PAGES}-{geeklistId}-*.xml on the shared volume
// (same lookup xml-fetcher's files land in via updateData.ts's own
// getLatestXmlFilename/getXml), parsing whichever pages are actually
// present. A missing page is routine (a quiet fair, or xml-fetcher hasn't
// caught up yet) - not an error, it just stops the scan there.
async function loadRssEntries(geeklistId: number): Promise<RssActivityEntry[]> {
	const entries: RssActivityEntry[] = [];

	for (let page = 1; page <= RSS_MAX_PAGES; page++) {
		const fileResult = getLatestXmlFilename(`rss-page${page}`, geeklistId);
		if (fileResult.isErr()) break;

		const xmlResult = await getXml(fileResult.value);
		if (xmlResult.isErr()) {
			console.warn(
				`${geeklistId}: Could not read ${fileResult.value}: ${xmlResult.error}`,
			);
			continue;
		}

		try {
			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
			});
			const parsed = parser.parse(xmlResult.value);
			entries.push(...parseRssPage(parsed?.rss?.channel ?? {}));
		} catch (error) {
			console.warn(
				`${geeklistId}: Failed to parse ${fileResult.value}: ${error}`,
			);
		}
	}

	return entries;
}
