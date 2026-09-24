import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { ItemWrapper } from "../processors/ItemWrapper";

// Real comment text captured live during this session - both examples were
// confirmed to produce a wrong stored bid before the extractString fix.
const buildItem = (commentText: string) => {
	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>Test body</body>
	<comment username="alice" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
${commentText}
</comment>
</item>`;

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
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
});
