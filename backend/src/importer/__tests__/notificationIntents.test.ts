import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import {
	computeNotificationIntents,
	PreviousItemState,
} from "../notifications/notificationIntents";
import { ItemWrapper } from "../processors/ItemWrapper";

// Same inline-XML-through-the-real-parser approach as outbidBidders.test.ts.
const buildItem = (options: {
	seller?: string;
	body?: string;
	bids?: { username: string; text: string }[];
}) => {
	const { seller = "owner", body = "Test body", bids = [] } = options;

	const comments = bids
		.map(
			({ username, text }) => `
		<comment username="${username}" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
${text}
</comment>`,
		)
		.join("");

	const xml = `<item id="1" objecttype="thing" subtype="boardgame" objectid="1" objectname="Test Item" username="${seller}" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>${body}</body>
	${comments}
</item>`;

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const source = parser.parse(xml)["item"];
	// referenceYear 2024 - any "Auction ends" date without a year resolves
	// safely in the past relative to whenever this test actually runs.
	return ItemWrapper.fromXml(1, source, 1700000000, 2024);
};

const previousState = (state: PreviousItemState) =>
	new Map([[1, state]]);

describe("computeNotificationIntents", () => {
	it("fires outbid and newBid together on a real bid overtaking the previous highest", () => {
		const item = buildItem({
			bids: [
				{ username: "alice", text: "€5" },
				{ username: "bob", text: "€10" },
			],
		});

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: 5, isEnded: false }),
		);

		expect(intents).toEqual([
			{ username: "alice", type: "outbid", item },
			{ username: "owner", type: "newBid", item },
		]);
	});

	it("fires newBid (not outbid) on the very first bid ever placed", () => {
		const item = buildItem({ bids: [{ username: "alice", text: "€10" }] });

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: null, isEnded: false }),
		);

		expect(intents).toEqual([
			{ username: "owner", type: "newBid", item },
		]);
	});

	it("doesn't fire newBid when currentBid rises from a body edit with no real bid", () => {
		// No comments at all - currentBid falls back to the parsed starting
		// bid, with no highestBidder.
		const item = buildItem({ body: "Starting bid: €15" });

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: 10, isEnded: false }),
		);

		expect(intents).toEqual([]);
	});

	it("fires won when isEnded transitions from false to true with a highest bidder", () => {
		const item = buildItem({
			body: "Auction ends: 1 Jan",
			bids: [{ username: "alice", text: "€10" }],
		});
		expect(item.isEnded).toBe(true);

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: 10, isEnded: false }),
		);

		expect(intents).toEqual([{ username: "alice", type: "won", item }]);
	});

	it("doesn't re-fire won for an item that was already ended", () => {
		const item = buildItem({
			body: "Auction ends: 1 Jan",
			bids: [{ username: "alice", text: "€10" }],
		});

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: 10, isEnded: true }),
		);

		expect(intents).toEqual([]);
	});

	it("returns nothing when nothing changed", () => {
		const item = buildItem({ bids: [{ username: "alice", text: "€10" }] });

		const intents = computeNotificationIntents(
			[item],
			previousState({ currentBid: 10, isEnded: false }),
		);

		expect(intents).toEqual([]);
	});

	it("skips items with no previous state entry", () => {
		const item = buildItem({ bids: [{ username: "alice", text: "€10" }] });

		expect(computeNotificationIntents([item], new Map())).toEqual([]);
	});
});
