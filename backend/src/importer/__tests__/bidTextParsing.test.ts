import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";
import { removeQuoted } from "../util/helpers";

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
});

// Real comment text captured live during this session - both examples were
// confirmed to produce a wrong stored bid before the extractString fix.
const buildItem = (commentText: string) => {
	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>Test body</body>
	<comment username="alice" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
${commentText}
</comment>
</item>`;

	const source = parser.parse(xml)["item"];
	return ItemWrapper.fromXml(1, source, 1700000000, 2024);
};

// Two comments so a broken isBin can't hide behind the binPrice fallback
// that getDerivedData() applies when there's no highest bid at all.
const buildItemWithTwoComments = (binPrice: number, binCommentText: string) => {
	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>[b]BIN:[/b] ${binPrice}</body>
	<comment username="alice" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">10</comment>
	<comment username="bob" date="Wed, 24 Apr 2024 14:47:25 +0000" postdate="Wed, 24 Apr 2024 14:47:25 +0000" editdate="Wed, 24 Apr 2024 14:47:25 +0000" thumbs="0">
${binCommentText}
</comment>
</item>`;

	const source = parser.parse(xml)["item"];
	return ItemWrapper.fromXml(1, source, 1700000000, 2024);
};

describe("bid text parsing - real-world tricky cases", () => {
	it("picks the €-prefixed amount over an unrelated number earlier in the comment", () => {
		const item = buildItem("5 Towers € 3");
		expect(item.currentBid).toBe(3);
	});

	it("doesn't pick up a number from a numeric game title", () => {
		const item = buildItem(
			"Warhammer 40,000: Heroes of Black Reach – Zoggrim the Kharnager €2",
		);
		expect(item.currentBid).toBe(2);
	});

	it("uses a raised bid, not the stale quoted one it's replacing", () => {
		// Real comment (item 12162915, Kessa): quotes their own earlier "10€"
		// bid plus a reply, then states a new, higher one.
		const item = buildItem(
			'[q="morpheus161186"][q="Kessa"]10€[/q]\nThank you for bidding![/q]\n\n12€',
		);
		expect(item.currentBid).toBe(12);
	});

	it("recognizes a BIN comment with no digits in it (item 13120076)", () => {
		// Real comment: "BIN White Castle Duel" - no number in the text at
		// all, so a broken isBin check silently fell back to "no bid found"
		// instead of the item's BIN price.
		const item = buildItemWithTwoComments(50, "BIN White Castle Duel");
		expect(item.currentBid).toBe(50);
	});
});

describe("removeQuoted", () => {
	it("strips BGG's real attributed quote syntax, not just a bare [q]", () => {
		expect(removeQuoted('[q="someone"]quoted text[/q]reply')).toBe("reply");
	});

	it("unwraps nested quotes-of-quotes", () => {
		expect(removeQuoted('[q="a"][q="b"]inner[/q]middle[/q]outer')).toBe(
			"outer",
		);
	});
});
