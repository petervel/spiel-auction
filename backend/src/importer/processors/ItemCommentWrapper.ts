import { Item, ItemComment, PrismaPromise } from "@prisma/client";
import { decode } from "html-entities";
import prisma from "../../prismaClient";
import {
	extractString,
	removeAllBggTags,
	removeQuoted,
	removeStrikethrough,
	toArray,
} from "../util/helpers";

export class ItemCommentWrapper {
	private dbObject: ItemComment;

	constructor(dbObject: ItemComment) {
		this.dbObject = dbObject;
	}

	public static fromXml(
		item: Item,
		source: Record<string, any>,
		updateTime: number,
	) {
		const text = decode(`${source["#text"]}`); // force this to be a string, for parsing purposes.

		const username = decode(source["@_username"]);

		let isBin = false;
		let bid = null;
		let oldBid = null;
		if (text.length != 0 && username != item.username) {
			let stripped = removeStrikethrough(text);
			stripped = removeQuoted(stripped);
			stripped = removeAllBggTags(stripped);
			const retracted = !!extractString(stripped, /\bretracted\b/i);
			if (!retracted) {
				isBin = !!extractString(stripped, /\bbin\b(?!\?)/i);

				bid = isBin
					? item.binPrice
					: ItemCommentWrapper.findBidNumber(stripped);

				oldBid = bid ?? ItemCommentWrapper.findBidNumber(text);
			}
		}

		const dbObject = {
			listId: item.listId,
			itemId: item.id,
			username,
			date: source["@_date"],
			postDate: new Date(source["@_postdate"]),
			postTimestamp: Number(
				Math.floor(Date.parse(source["@_postdate"]) / 1000),
			),
			editDate: new Date(source["@_editdate"]),
			editTimestamp: Number(
				Math.floor(Date.parse(source["@_editdate"]) / 1000),
			),
			thumbs: Number(source["@_thumbs"]),
			text,
			isBin,
			bid,
			oldBid,
			lastSeen: updateTime,
			deleted: false,
		};

		return new ItemCommentWrapper(dbObject);
	}

	private static findBidNumber(text: string): number | null {
		const bid = ItemCommentWrapper.findBidText(text);
		if (bid) {
			const bidNumber = Number(bid);
			if (bidNumber < 1000) {
				// dirty sanity check. should fix this properly in regex
				return bidNumber;
			}
		}
		return null;
	}

	private static findBidText(text: string): string | undefined {
		let bid = extractString(text, /(?:€\s*(\d+))|(?:(\d+)\s*€)/i);
		if (bid) return bid;

		bid = extractString(
			text,
			/(?:\b(?:euros?)\s*(\d+))|(?:(\d+)\s*(?:euros?))\b/i,
		);
		if (bid) return bid;

		bid = extractString(
			text,
			/\b(?:e|eu|eur|euro)\s*(\d+)\b|\b(\d+)\s*(?:e|eu|eur|euro)\b/i,
		);
		if (bid) return bid;

		bid = extractString(text, /(?:\b(\d+)\b)/);
		if (bid) return bid;

		return undefined;
	}

	public static loadAll(
		item: Item,
		source: String,
		updateTime: number,
	): ItemCommentWrapper[] {
		if (!source) return [];

		return toArray(source).map((commentData) =>
			ItemCommentWrapper.fromXml(item, commentData, updateTime),
		);
	}

	public static saveAll(comments: ItemCommentWrapper[]) {
		const upserts: PrismaPromise<any>[] = comments.map((comment) => {
			const upsert = prisma.itemComment.upsert({
				where: {
					itemId_username_postTimestamp: {
						itemId: comment.dbObject.itemId,
						username: comment.dbObject.username,
						postTimestamp: comment.dbObject.postTimestamp,
					},
				},
				create: comment.dbObject,
				update: comment.dbObject,
			});
			return upsert;
		});
		return upserts;
	}

	public static getHighestBid(comments: ItemCommentWrapper[]) {
		let highestBidder = null;
		let highestBid: number | null = null;
		for (const comment of comments) {
			const bid = comment.dbObject.bid as number;
			if (
				!Number.isNaN(bid) &&
				(highestBid == null || bid > highestBid)
			) {
				highestBid = bid;
				highestBidder = comment.dbObject.username;
			}
		}
		return {
			highestBid: highestBidder ? highestBid : null,
			highestBidder,
		};
	}
}
