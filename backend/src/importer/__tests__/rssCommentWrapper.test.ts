import { Item, ItemType } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { ItemCommentWrapper } from "../processors/ItemCommentWrapper";
import { parseRssPage } from "../processors/RssCommentWrapper";

// Real shapes captured live from
// https://boardgamegeek.com/rss/geeklist/382717?page=1&comments=1 during
// the session that designed this feature - kept close to the original
// formatting (including the author/related-item <p> prefixes every real
// "New comment" entry carries) so the stripping regexes are genuinely
// exercised, not just fed already-clean text.
const buildChannel = (items: string[]) => {
	const xml = `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
${items.join("\n")}
</channel>
</rss>`;
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	return parser.parse(xml)["rss"]["channel"];
};

const commentEntry = ({
	itemId,
	username,
	text,
	pubDate = "Fri, 18 Sep 2026 20:39:12 +0000",
}: {
	itemId: number;
	username: string;
	text: string;
	pubDate?: string;
}) => `<item>
	<title>New comment on  Item for GeekList "Test auction list" </title>
	<description>
		&lt;p&gt;by &lt;a  href=&#039;https://boardgamegeek.com/user/${username}&#039;&gt;${username}&lt;/a&gt;&lt;/p&gt;
		&lt;p&gt;Related Item: &lt;a  href=&quot;https://boardgamegeek.com/boardgame/1/some-game&quot;   &gt;Some Game&lt;/a&gt;&lt;/p&gt;	${text}
	</description>
	<link>https://boardgamegeek.com/geeklist/1/test-auction-list?itemid=${itemId}&amp;commentid=999#comment999</link>
	<guid>https://boardgamegeek.com/geeklist/1/test-auction-list?itemid=${itemId}&amp;commentid=999#comment999</guid>
	<pubDate>${pubDate}</pubDate>
	<dc:creator>${username}</dc:creator>
</item>`;

const itemAddedEntry = ({
	itemId,
	pubDate = "Fri, 18 Sep 2026 19:27:28 +0000",
}: {
	itemId: number;
	pubDate?: string;
}) => `<item>
	<title>GeekList Item: Item for GeekList "Test auction list" </title>
	<description>
		&lt;p&gt;by &lt;a  href=&#039;https://boardgamegeek.com/user/seller&#039;&gt;seller&lt;/a&gt;&lt;/p&gt;
	<![CDATA[
		An item Board Game:
		<a href="https://boardgamegeek.com/boardgame/1/some-game">Some Game</a>
		has been added to the geeklist
		<a href="https://boardgamegeek.com/geeklist/1/test-auction-list?itemid=${itemId}#${itemId}">Test auction list</a>
	]]>
	</description>
	<link>https://boardgamegeek.com/geeklist/1/test-auction-list?itemid=${itemId}#${itemId}</link>
	<guid>https://boardgamegeek.com/geeklist/1/test-auction-list?itemid=${itemId}#${itemId}</guid>
	<pubDate>${pubDate}</pubDate>
	<dc:creator>seller</dc:creator>
</item>`;

const buildFakeItem = (overrides: Partial<Item> = {}): Item => ({
	id: 42,
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

describe("parseRssPage", () => {
	it("parses a real-shaped bid comment into an xmlapi-<comment>-compatible source", () => {
		const channel = buildChannel([
			commentEntry({
				itemId: 13158589,
				username: "Rey Marc",
				text: "25€",
			}),
		]);

		const entries = parseRssPage(channel);

		expect(entries).toHaveLength(1);
		expect(entries[0].itemId).toBe(13158589);
		expect(entries[0].pubDateSeconds).toBe(
			Math.floor(Date.parse("Fri, 18 Sep 2026 20:39:12 +0000") / 1000),
		);
		expect(entries[0].source).not.toBeNull();

		// Feed the synthetic source straight into the real, unmodified
		// ItemCommentWrapper.fromXml - this is the key reuse the design
		// depends on, so assert the actual bid parsing runs correctly on it.
		const item = buildFakeItem({ id: 13158589 });
		const comment = ItemCommentWrapper.fromXml(
			item,
			entries[0].source!,
			1700000000,
		);
		expect(comment.bid).toBe(25);
		expect(comment.username).toBe("Rey Marc");
	});

	it("skips a GeekList Item added/edited entry for import, but keeps its pubDate", () => {
		const channel = buildChannel([itemAddedEntry({ itemId: 13158527 })]);

		const entries = parseRssPage(channel);

		expect(entries).toHaveLength(1);
		expect(entries[0].source).toBeNull();
		expect(entries[0].pubDateSeconds).toBe(
			Math.floor(Date.parse("Fri, 18 Sep 2026 19:27:28 +0000") / 1000),
		);
	});

	it("produces no bid for a non-bid comment, without dropping the entry", () => {
		const channel = buildChannel([
			commentEntry({
				itemId: 13060047,
				username: "Kiki93",
				text: "nice item!",
			}),
		]);

		const entries = parseRssPage(channel);

		expect(entries).toHaveLength(1);
		const item = buildFakeItem({ id: 13060047 });
		const comment = ItemCommentWrapper.fromXml(
			item,
			entries[0].source!,
			1700000000,
		);
		expect(comment.bid).toBeNull();
	});

	it("handles a mixed page (comment + item-added) and preserves document order", () => {
		const channel = buildChannel([
			commentEntry({ itemId: 1, username: "alice", text: "10€" }),
			itemAddedEntry({ itemId: 2 }),
		]);

		const entries = parseRssPage(channel);

		// itemId is only extracted for comment entries - item-added ones are
		// never matched to anything, so there's no need to parse it out.
		expect(entries.map((e) => e.itemId)).toEqual([1, null]);
		expect(entries[0].source).not.toBeNull();
		expect(entries[1].source).toBeNull();
	});
});
