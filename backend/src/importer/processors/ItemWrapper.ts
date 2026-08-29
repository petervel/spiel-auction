import { Item, ItemType, PrismaPromise } from "@prisma/client";
import { decode } from "html-entities";
import prisma from "../../prismaClient";
import {
	extractNumber,
	extractString,
	formatTimeToDate,
	nullToUndefined,
	parseEndDateString,
	removeStrikethrough,
} from "../util/helpers";
import { ItemCommentWrapper } from "./ItemCommentWrapper";

// Let users specify a more specific "Title: <my_title>" for these
const GENERIC_ENTRIES = [
	268620, // Similo
];

export class ItemWrapper {
	private dbObject: Item;
	private comments: ItemCommentWrapper[];

	constructor(itemObject: Item, comments: ItemCommentWrapper[]) {
		this.dbObject = itemObject;
		this.comments = comments;
	}

	public get id(): number {
		return this.dbObject.id;
	}

	public get objectName(): string {
		return this.dbObject.objectName;
	}

	public get currentBid(): number | null {
		return this.dbObject.currentBid ?? null;
	}

	public get username(): string {
		return this.dbObject.username;
	}

	public get isEnded(): boolean {
		return this.dbObject.isEnded;
	}

	public get highestBidder(): string | null {
		return this.dbObject.highestBidder;
	}

	// Every distinct bidder whose bid falls in [previousHighestBid,
	// currentBid) - i.e. everyone who was winning or placed a losing bid
	// within this same update window, now superseded. Includes the
	// previous highest bidder (their comment isn't new, but they only just
	// became outbid) and excludes the new highest bidder, including their
	// own earlier, now-superseded bids if they raised their own price.
	public getOutbidBidders(previousHighestBid: number): string[] {
		const newHighestBidder = this.dbObject.highestBidder;
		const newHighestBid = this.dbObject.currentBid ?? Infinity;

		const seen = new Set<string>();
		const bidders: string[] = [];
		for (const comment of this.comments) {
			const bid = comment.bid;
			if (bid == null || bid < previousHighestBid || bid >= newHighestBid) {
				continue;
			}

			const username = comment.username;
			const key = username.toLowerCase();
			if (newHighestBidder && key === newHighestBidder.toLowerCase()) {
				continue;
			}
			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			bidders.push(username);
		}

		return bidders;
	}

	public static fromXml(
		listId: number,
		source: Record<string, any>,
		updateTime: number,
		referenceYear: number,
	): ItemWrapper {
		let itemData: Item = {
			id: Number(source["@_id"]),
			listId: listId,
			objectType: source["@_objecttype"],
			objectSubtype: source["@_subtype"],
			objectId: Number(source["@_objectid"]),
			objectName: decode(source["@_objectname"]),
			username: decode(source["@_username"]),
			postDate: new Date(source["@_postdate"]),
			postTimestamp: Math.floor(Date.parse(source["@_postdate"]) / 1000),
			editDate: new Date(source["@_editdate"]),
			editTimestamp: Math.floor(Date.parse(source["@_editdate"]) / 1000),
			thumbs: Number(source["@_thumbs"]),
			imageId: Number(source["@_imageid"]),
			body: decode(source["body"]),
			lastSeen: updateTime,
			deleted: false,
			language: null,
			condition: null,
			startingBid: null,
			softReserve: null,
			hardReserve: null,
			binPrice: null,
			auctionEnd: null,
			auctionEndDate: null,
			highestBidder: null,
			hasBids: false,
			isSold: false,
			isEnded: false,
			currentBid: null,
			itemType: ItemType.GAME,
			...this.getDerivedData(source["body"], [], true, referenceYear),
			...this.getDerivedData(source["body"], [], false, referenceYear),
		};

		if (source["body"].toLowerCase().includes("auction ended")) {
			itemData.isEnded = true;
		}
		const commentData = ItemCommentWrapper.loadAll(
			itemData,
			source["comment"],
			updateTime,
		);

		const unstrikedData = this.getDerivedData(
			source["body"],
			commentData,
			true,
			referenceYear,
		);

		const strikedData = this.getDerivedData(
			source["body"],
			commentData,
			false,
			referenceYear,
		);

		itemData = {
			...itemData,
			...strikedData,
			...unstrikedData,
		};

		const stripped = removeStrikethrough(source["body"]);
		itemData.isSold =
			!!itemData.highestBidder &&
			itemData.currentBid == itemData.binPrice;

		itemData.isEnded =
			itemData.isSold ||
			(stripped.length < 200 &&
				(stripped.length == 0 ||
					source["body"].length / stripped.length > 4)) ||
			(!!itemData.auctionEndDate &&
				itemData.auctionEndDate < formatTimeToDate());

		if (itemData.objectId === 23953) {
			// Outside the Scope of BGG
			const alternateName = extractString(
				source["body"],
				/\[size=\d+\]\[b\]\[color=#[0-9a-f]{6}\](.*?)\[\/color\]\[\/b\]\[\/size\]/i,
				true,
			)?.trim();
			itemData.objectName = alternateName ?? itemData.objectName;
		} else if (GENERIC_ENTRIES.includes(itemData.objectId)) {
			// Similo etc
			const title =
				extractString(
					source["body"],
					/(?:\[b\])?\s*title(?:\[\/b\])?\s*:\s*(?:\[[^\]]*])*([^[\n]*)/i,
				) ?? null;
			itemData.objectName = title ?? itemData.objectName;
		} else {
			// Bundles
			const bundle =
				extractString(
					source["body"],
					/(?:\[b\])?\s*bundle?(?:\[\/b\])?\s*:\s*(?:\[[^\]]*])*([^[\n]*)/i,
				) ?? null;

			if (bundle) {
				itemData.objectName = `${itemData.objectName} (bundle)`;
			}
		}
		return new ItemWrapper(itemData, commentData);
	}

	private static getDerivedData(
		text: string,
		commentsData: ItemCommentWrapper[],
		removeStrikeThrough: boolean,
		referenceYear: number,
	) {
		text = removeStrikeThrough ? removeStrikethrough(text) : text;

		const auctionTypeString =
			extractString(
				text,
				/(?:\[b\])?\s*type?(?:\[\/b\])?\s*:\s*(?:\[[^\]]*])*([^[\n]*)/i,
			)?.toLowerCase() ?? "GAME";

		let itemType: ItemType = ItemType.GAME;
		if (auctionTypeString?.indexOf("promo") !== -1) {
			itemType = ItemType.PROMO;
		}

		const language =
			extractString(
				text,
				/(?:\[b\])?\s*languages?(?:\[\/b\])?\s*:\s*(?:\[[^\]]*])*([^[\n]*)/i,
			) ?? null;

		const _condition = extractString(
			text,
			/(?:\[b\])?\s*condition(?:\[\/b\])?\s*:?\s*(?:\[[^\]]*])*([^[\n]*)/i,
		);
		const condition = _condition
			? _condition?.replace(/:[a-z]+:/g, "").trim()
			: null;

		const startingBid =
			extractNumber(
				text,
				/(?:\[b\])?\s*starting\s*(?:bid)?(?:price)?\s*(?:\([^\)]*\))?(?:\[\/b\])?(?:\s*:\s*)?(?:\[[^\]]*])*\s*€?(?:euro)?\s*(\d+)(?:,-)?€?(?:euro)?(?:[^[\n]*)/i,
			) ?? null;

		const softReserve =
			extractNumber(
				text,
				/(?:\[b\])?\s*soft\s*(?:reserve)?(?:\[\/b\])?(?:\s*:\s*)?(?:\[[^\]]*])*€\s*(\d+)(?:,-)?(?:[^[\n]*)/i,
			) ?? null;

		const hardReserve =
			extractNumber(
				text,
				/(?:\[b\])?\s*hard\s*(?:reserve)?(?:\[\/b\])?(?:\s*:\s*)?(?:\[[^\]]*])*€\s*(\d+)(?:,-)?(?:[^[\n]*)/i,
			) ?? null;

		const binPrice =
			extractNumber(
				text,
				/(?:\[b\])?\s*bin\s*(?:price)?(?:\[\/b\])?(?:\s*:\s*)?(?:\[[^\]]*])*€?(?:euro)?\s*(\d+)(?:,-)?(?:[^[\n]*)/i,
			) ?? null;

		const _auctionEnd =
			extractString(
				text,
				/(?:\[b\])?\s*auction ends(?:\[\/b\])?\s*:?\s*(?:\[[^\]]*])*([^[\n]*)/i,
			) ?? null;

		const auctionEnd = _auctionEnd
			? _auctionEnd
					.replace(/^,/, "")
					.replace(/,$/, "")
					.replace(/^[\s,]*/, "")
			: null;
		const auctionEndDate = auctionEnd
			? (parseEndDateString(auctionEnd, referenceYear) ?? null)
			: null;

		const { highestBid, highestBidder } =
			ItemCommentWrapper.getHighestBid(commentsData);

		const hasBids = !!highestBidder;

		const currentBid =
			highestBid ??
			startingBid ??
			softReserve ??
			hardReserve ??
			binPrice ??
			0;

		return nullToUndefined({
			language,
			condition,
			startingBid,
			softReserve,
			hardReserve,
			binPrice,
			auctionEnd,
			auctionEndDate,
			highestBidder,
			hasBids,
			currentBid,
			itemType,
		});
	}

	public static loadAll(
		listId: number,
		source: String,
		updateTime: number,
		referenceYear: number,
	): ItemWrapper[] {
		if (!source) return [];

		const itemsArray = Array.isArray(source) ? source : [source];

		const items = [];
		for (const itemArray of itemsArray) {
			const wrapper = ItemWrapper.fromXml(
				listId,
				itemArray,
				updateTime,
				referenceYear,
			);

			items.push(wrapper);
		}

		return items;
	}

	public static saveAll(items: ItemWrapper[]) {
		let upserts: PrismaPromise<any>[] = [];
		for (const wrapper of items) {
			upserts.push(
				prisma.item.upsert({
					where: { id: wrapper.dbObject.id },
					create: wrapper.dbObject,
					update: wrapper.dbObject,
				}),
			);

			const commentUpserts = ItemCommentWrapper.saveAll(wrapper.comments);
			upserts = upserts.concat(commentUpserts);
		}

		return upserts;
	}
}
