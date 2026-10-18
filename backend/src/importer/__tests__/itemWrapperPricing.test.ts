import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";

// Same inline-XML-through-the-real-parser approach as outbidBidders.test.ts.
const buildItem = (
	body: string,
	options: {
		sold?: boolean;
		comments?: { username: string; text: string }[];
	} = {},
) => {
	const commentsXml = (options.comments ?? [])
		.map(
			(c) =>
				`<comment username="${c.username}" date="Wed, 19 Oct 2022 12:00:00 +0000" postdate="Wed, 19 Oct 2022 12:00:00 +0000" editdate="Wed, 19 Oct 2022 12:00:00 +0000" thumbs="0">${c.text}</comment>`,
		)
		.join("\n");
	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0"${options.sold ? ' sold="1"' : ""} imageid="1">
	<body>${body}</body>
	${commentsXml}
</item>`;

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const source = parser.parse(xml)["item"];
	return ItemWrapper.fromXml(1, source, 1700000000, 2024);
};

describe("starting bid parsing", () => {
	it("reads the plain case with no strikethrough", () => {
		const item = buildItem("[b]Starting bid[/b]: €35,-");
		expect(item.currentBid).toBe(35);
	});

	it("reads the reduced price when a strikethrough old price is tagged separately", () => {
		// A [COLOR] tag wraps both the struck-through old price and the new
		// bold price - stripping the [-]...[/-] leaves a stray space between
		// [COLOR=...] and [b], which used to break the tag-skipping regex
		// before it ever reached the digits.
		const item = buildItem(
			"[size=13][b]Starting bid[/b]: [COLOR=#0033CC][-]€45,-[/-] [b]€35,-[/b][/COLOR][/size]",
		);
		expect(item.currentBid).toBe(35);
	});

	it("reads the abbreviated 'START' form, not just 'STARTING'", () => {
		// Real body text (item 13142984): "START BID : 15€" - the regex used
		// to require the "-ing" suffix, so this never matched and the item
		// fell all the way back to its BIN price instead.
		const item = buildItem("START BID : 15€");
		expect(item.currentBid).toBe(15);
	});
});

describe("explicit end markers", () => {
	// Long enough (after stripping, which here is a no-op - nothing is
	// struck through) that the "mostly struck through" heuristic alone
	// (stripped.length < 200) can't explain isEnded - isolates the
	// explicit-text path from the other two isEnded triggers.
	const longUnstruckPrefix = "A".repeat(250);

	it("ends on 'auction ended' even with plenty of leftover un-struck text", () => {
		// Used to be set here and then unconditionally overwritten a few
		// lines later, so writing this phrase did nothing at all.
		const item = buildItem(`${longUnstruckPrefix} Auction ended.`);
		expect(item.isEnded).toBe(true);
	});

	it("ends on 'sold to [user=' - BGG's own @-mention markup for naming a winner", () => {
		const item = buildItem(
			`${longUnstruckPrefix} Sold to [user=SomeWinner]`,
		);
		expect(item.isEnded).toBe(true);
	});

	it("does not end on long plain text with neither marker", () => {
		const item = buildItem(longUnstruckPrefix);
		expect(item.isEnded).toBe(false);
	});

	it("ends when the SELLER comments 'sold to [user=', not just in the body", () => {
		const item = buildItem(longUnstruckPrefix, {
			comments: [{ username: "owner", text: "Sold to [user=SomeWinner]" }],
		});
		expect(item.isEnded).toBe(true);
	});

	it("does not end when a bidder (not the seller) comments 'sold to [user='", () => {
		// Only the seller's own word is trusted here - a bidder could write
		// anything, including falsely claiming to have won.
		const item = buildItem(longUnstruckPrefix, {
			comments: [
				{ username: "someBidder", text: "Sold to [user=SomeWinner]" },
			],
		});
		expect(item.isEnded).toBe(false);
	});
});

describe("native sold attribute", () => {
	it("marks both isSold and isEnded, trusted over every other heuristic", () => {
		const item = buildItem("Plain listing, no markers at all.", {
			sold: true,
		});
		expect(item.isSold).toBe(true);
		expect(item.isEnded).toBe(true);
	});

	it("leaves isSold/isEnded false without it", () => {
		const item = buildItem("Plain listing, no markers at all.");
		expect(item.isSold).toBe(false);
		expect(item.isEnded).toBe(false);
	});
});
