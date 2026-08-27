import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";

// The real geeklist-305536 fixture (used in geeklist-305536.test.ts) only
// has single-bidder items, so it doesn't exercise multi-bidder contention -
// the interesting cases for getOutbidBidders(). Build small inline XML
// fragments instead, run through the real parsing/derivation pipeline.
const buildItem = (bids: { username: string; text: string }[]) => {
	const comments = bids
		.map(
			({ username, text }) => `
		<comment username="${username}" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
${text}
</comment>`,
		)
		.join("");

	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>Test body</body>
	${comments}
</item>`;

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const source = parser.parse(xml)["item"];
	return ItemWrapper.fromXml(1, source, 1700000000, 2024);
};

describe("ItemWrapper.getOutbidBidders", () => {
	it("includes the previous highest bidder even though their comment isn't new", () => {
		const item = buildItem([
			{ username: "alice", text: "€5" },
			{ username: "bob", text: "€10" },
		]);

		expect(item.getOutbidBidders(5)).toEqual(["alice"]);
	});

	it("dedupes a bidder who placed multiple now-superseded bids", () => {
		const item = buildItem([
			{ username: "alice", text: "€5" },
			{ username: "alice", text: "€8" },
			{ username: "bob", text: "€10" },
		]);

		expect(item.getOutbidBidders(5)).toEqual(["alice"]);
	});

	it("excludes bids already below the previous highest bid", () => {
		const item = buildItem([
			{ username: "charlie", text: "€3" },
			{ username: "alice", text: "€5" },
			{ username: "bob", text: "€10" },
		]);

		expect(item.getOutbidBidders(5)).toEqual(["alice"]);
	});

	it("excludes the new highest bidder's own earlier, now-superseded bid", () => {
		const item = buildItem([
			{ username: "alice", text: "€5" },
			{ username: "bob", text: "€7" },
			{ username: "bob", text: "€10" },
		]);

		expect(item.getOutbidBidders(5)).toEqual(["alice"]);
	});

	it("returns nothing when there's no bid in the previous-to-current range", () => {
		const item = buildItem([{ username: "alice", text: "€10" }]);

		expect(item.getOutbidBidders(0)).toEqual([]);
	});
});
