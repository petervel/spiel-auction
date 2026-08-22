import { XMLParser } from "fast-xml-parser";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";

// Fixture fetched from https://boardgamegeek.com/xmlapi/geeklist/305536,
// the author's own test list (id 305536, "Auction Tool Test") - it's kept
// stable on purpose so this fixture doesn't need to be regenerated. If
// items are ever added/changed on that list, re-fetch it (see
// xml-fetcher/fetchXml.ts for the URL) and update the expectations below
// to match.
const FIXTURES_DIR = path.join(__dirname, "../__fixtures__");

const parseGeeklist = (file: string): Record<string, any> => {
	const xmlString = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	return parser.parse(xmlString)["geeklist"];
};

const loadItems = (file: string) => {
	const geeklist = parseGeeklist(file);
	const listId = Number(geeklist["@_id"]);
	// Reference year for resolving imprecise end-date notations - not
	// exercised by any assertion here, so any real year is fine.
	return ItemWrapper.loadAll(listId, geeklist["item"], 1700000000, 2024);
};

describe("geeklist 305536 fixture", () => {
	it("?comments=1 fetch has comments on the items that received bids", () => {
		const geeklist = parseGeeklist("geeklist-305536-comments.xml");
		expect(geeklist["item"]).toHaveLength(12);
	});
});

describe("bid derivation from real comment data", () => {
	const items = loadItems("geeklist-305536-comments.xml");

	it("picks the highest bid, ignoring the item owner's own comments", () => {
		// Beez (9343343): petervel (the item's own poster) comments "NOT THE
		// BEEEEEZZZZ!!!" and later "€12" - neither counts as a bid since the
		// bidder is the item owner. leonneerkens' "€7" is the only real bid.
		const beez = items.find((i) => (i as any).dbObject.id === 9343343)!;
		expect((beez as any).dbObject).toMatchObject({
			highestBidder: "leonneerkens",
			currentBid: 7,
			hasBids: true,
		});
	});

	it("parses a bare-number bid embedded in surrounding text", () => {
		// Deep Blue (9343346): JokeVelSlot's comment is "Ik ga hoger Leonne
		// 🙂\n8" - the bid is the trailing bare number, not the emoji or text.
		const deepBlue = items.find((i) => (i as any).dbObject.id === 9343346)!;
		expect((deepBlue as any).dbObject).toMatchObject({
			highestBidder: "JokeVelSlot",
			currentBid: 8,
			hasBids: true,
		});
	});

	it("does not count a numeric comment from the item's own poster as a bid", () => {
		// G.G.A. (9343355): the only comment ("42") is from petervel, the
		// item's own poster, so the item has no real bid despite the comment.
		const gga = items.find((i) => (i as any).dbObject.id === 9343355)!;
		expect((gga as any).dbObject).toMatchObject({
			highestBidder: null,
			currentBid: 0,
			hasBids: false,
		});
	});

	it("falls back to the starting bid when there are no bid comments", () => {
		// Memory (9332373): no comments at all.
		const memory = items.find((i) => (i as any).dbObject.id === 9332373)!;
		expect((memory as any).dbObject).toMatchObject({
			startingBid: 4,
			highestBidder: null,
			currentBid: 4,
			hasBids: false,
		});
	});

	it("resolves the special-cased 'Outside the Scope of BGG' title from the body", () => {
		const outsideScope = items.find(
			(i) => (i as any).dbObject.id === 12072141,
		)!;
		expect((outsideScope as any).dbObject.objectName).toBe("Amazing stuff");
	});
});
