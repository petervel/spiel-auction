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

export class ItemWrapper {
	private dbObject: Item;
	private comments: ItemCommentWrapper[];

	constructor(itemObject: Item, comments: ItemCommentWrapper[]) {
		this.dbObject = itemObject;
		this.comments = comments;
	}

	public static fromXml(
		listId: number,
		source: Record<string, any>,
		updateTime: number,
	): ItemWrapper {
		const itemId = Number(source["@_id"]);

		const commentData = ItemCommentWrapper.loadAll(
			itemId,
			source["comment"],
			updateTime,
		);

		const itemData: Item = {
			id: itemId,
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
			...this.getDerivedData(source["body"], commentData, true),
			...this.getDerivedData(source["body"], commentData, false),
		};

		return new ItemWrapper(itemData, commentData);
	}

	private static getDerivedData(
		text: string,
		commentsData: ItemCommentWrapper[],
		removeStrikeThrough: boolean = true,
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
				/(?:\[b\])?\s*starting\s*(?:bid)?(?:price)?(?:\[\/b\])?(?:\s*:\s*)?(?:\[[^\]]*])*€?(?:euro)?\s*(\d+)(?:,-)?€?(?:euro)?(?:[^[\n]*)/i,
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
			? (parseEndDateString(auctionEnd) ?? null)
			: null;

		const { highestBid, highestBidder } =
			ItemCommentWrapper.getHighestBid(commentsData);

		const isSold = !!highestBidder && highestBid == binPrice;

		const hasBids = !!highestBidder;

		const stripped = removeStrikethrough(text);
		let isEnded =
			isSold ||
			(stripped.length < 100 &&
				(stripped.length == 0 || text.length / stripped.length > 4)) ||
			(!!auctionEndDate && auctionEndDate < formatTimeToDate());

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
			isSold,
			isEnded,
			currentBid,
			itemType,
		});
	}

	public static loadAll(
		listId: number,
		source: String,
		updateTime: number,
	): ItemWrapper[] {
		if (!source) return [];

		const itemsArray = Array.isArray(source) ? source : [source];

		const items = [];
		for (const itemArray of itemsArray) {
			const wrapper = ItemWrapper.fromXml(listId, itemArray, updateTime);

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
