import { Item, ItemType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ItemCommentWrapper } from "../processors/ItemCommentWrapper";

const buildFakeItem = (overrides: Partial<Item> = {}): Item => ({
	id: 1,
	listId: 1,
	objectType: "thing",
	objectSubtype: "boardgame",
	objectId: 1,
	objectName: "Some Game",
	username: "seller",
	postDate: new Date(0),
	postTimestamp: 0,
	editDate: new Date(0),
	editTimestamp: 0,
	thumbs: 0,
	imageId: 0,
	body: "",
	language: null,
	condition: null,
	startingBid: null,
	softReserve: null,
	hardReserve: null,
	binPrice: null,
	auctionEnd: null,
	auctionEndDate: null,
	hasBids: false,
	isSold: false,
	isEnded: false,
	itemType: ItemType.GAME,
	currentBid: null,
	highestBidder: null,
	lastSeen: 0,
	deleted: false,
	...overrides,
});

const buildComment = (text: string, username = "bidder") => {
	const item = buildFakeItem();
	return ItemCommentWrapper.fromXml(
		item,
		{
			"#text": text,
			"@_username": username,
			"@_date": "Fri, 18 Sep 2026 20:39:12 +0000",
			"@_postdate": "Fri, 18 Sep 2026 20:39:12 +0000",
			"@_editdate": "Fri, 18 Sep 2026 20:39:12 +0000",
			"@_thumbs": "0",
		},
		1700000000,
	);
};

describe("removeKnownContexts word boundaries", () => {
	it("doesn't eat a bid immediately followed by a word merely starting with a context keyword", () => {
		// Real case (item 13203560): a bid of "€4" on a game titled "Gamer
		// Over! A Game Fair Murder Mystery" - the "12 games" context-strip
		// regex had no trailing \b, so "4 Game" matched inside "4 Gamer" and
		// the bid vanished before the bid-finding regex ever ran.
		const comment = buildComment(
			"€4 Gamer Over! A Game Fair Murder Mystery",
		);
		expect(comment.bid).toBe(4);
	});

	it("still strips a genuine '12 games' context phrase", () => {
		const comment = buildComment(
			"Will trade for 12 games total, interested?",
		);
		expect(comment.bid).toBeNull();
	});

	it("doesn't eat a bid followed by a word starting with 'sec'", () => {
		const comment = buildComment("€7 Sector 2045 expansion");
		expect(comment.bid).toBe(7);
	});

	it("doesn't eat a bid followed by a word starting with 'day'", () => {
		const comment = buildComment("€12 Daytona 500 card game");
		expect(comment.bid).toBe(12);
	});
});
