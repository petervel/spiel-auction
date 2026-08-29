// Manual QA script for the bid-update notification flows, since they end
// in a real device notification that nothing automated can verify. Seeds
// a fake item and runs the exact same ItemWrapper/notifyBidUpdates code
// path the importer uses, against a synthetic scenario chosen by
// SCENARIO.
//
// Usage (from inside the backend container, or via ts-node locally):
//   BGGUSERNAME=petervel SCENARIO=outbid npx ts-node src/scripts/testOutbidNotification.ts
//   BGGUSERNAME=petervel SCENARIO=newBid npx ts-node src/scripts/testOutbidNotification.ts
//   BGGUSERNAME=petervel SCENARIO=won npx ts-node src/scripts/testOutbidNotification.ts
//
// - outbid: BGGUSERNAME is winning at €5, then bids twice more (€5, €7 -
//   both now superseded, proving dedup), then someoneelse takes the lead
//   at €10. BGGUSERNAME should get exactly one "outbid" notification.
// - newBid: BGGUSERNAME is the item's seller with no bids yet, then
//   someoneelse places the first bid at €10. BGGUSERNAME should get one
//   "newBid" notification.
// - won: BGGUSERNAME is winning at €10 on an item that isn't ended yet,
//   then the same XML reappears with the item now marked ended.
//   BGGUSERNAME should get one "won" notification.
//
// Requires: a User row with bggUsername=BGGUSERNAME and an active
// PushSubscription (i.e. you've clicked "Enable notifications" in
// Settings while logged in as that user), and the 305536 test List
// already existing in the DB (created by any prior import of geeklist
// 305536 - the "Auction Test" fair uses it).
import dotenv from "dotenv";
dotenv.config();

import { XMLParser } from "fast-xml-parser";
import { notifyBidUpdates } from "../importer/notifications/outbidNotifier";
import {
	computeNotificationIntents,
	PreviousItemState,
} from "../importer/notifications/notificationIntents";
import { ItemWrapper } from "../importer/processors/ItemWrapper";
import prisma from "../prismaClient";

const TEST_ITEM_ID = 999999999;
const TEST_LIST_ID = 305536;

type Scenario = "outbid" | "newBid" | "won";

const buildXml = (scenario: Scenario, bggUsername: string, ended: boolean) => {
	const comments: Record<Scenario, string> = {
		outbid: `
	<comment username="${bggUsername}" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
€5
</comment>
	<comment username="${bggUsername}" date="Wed, 24 Apr 2024 14:47:25 +0000" postdate="Wed, 24 Apr 2024 14:47:25 +0000" editdate="Wed, 24 Apr 2024 14:47:25 +0000" thumbs="0">
€7
</comment>
	<comment username="someoneelse" date="Wed, 24 Apr 2024 14:48:25 +0000" postdate="Wed, 24 Apr 2024 14:48:25 +0000" editdate="Wed, 24 Apr 2024 14:48:25 +0000" thumbs="0">
€10
</comment>`,
		newBid: `
	<comment username="someoneelse" date="Wed, 24 Apr 2024 14:48:25 +0000" postdate="Wed, 24 Apr 2024 14:48:25 +0000" editdate="Wed, 24 Apr 2024 14:48:25 +0000" thumbs="0">
€10
</comment>`,
		won: `
	<comment username="${bggUsername}" date="Wed, 24 Apr 2024 14:48:25 +0000" postdate="Wed, 24 Apr 2024 14:48:25 +0000" editdate="Wed, 24 Apr 2024 14:48:25 +0000" thumbs="0">
€10
</comment>`,
	};

	// The seller (item username) must differ from every bidder - bids from
	// the item's own poster are never counted, matching the real parser.
	const seller = scenario === "newBid" ? bggUsername : "owner";

	// isEnded is computed from body heuristics/auction-end-date, not a
	// literal "ended" flag - "Auction ends: 1 Jan" with referenceYear 2024
	// (passed to ItemWrapper.fromXml below) resolves to a date safely in
	// the past relative to whenever this script actually runs.
	const body = scenario === "won" && ended ? "Auction ends: 1 Jan" : "Test body";

	return `<item id="${TEST_ITEM_ID}" objecttype="thing" subtype="boardgame" objectid="1" objectname="TEST ITEM - ${scenario} flow" username="${seller}" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>${body}</body>${comments[scenario]}
</item>`;
};

const run = async () => {
	const bggUsername = process.env.BGGUSERNAME;
	const scenario = process.env.SCENARIO as Scenario | undefined;
	if (!bggUsername || !scenario) {
		console.error("Set BGGUSERNAME and SCENARIO (outbid|newBid|won).");
		process.exit(1);
	}

	const user = await prisma.user.findFirst({ where: { bggUsername } });
	if (!user) {
		console.error(`No User found with bggUsername "${bggUsername}".`);
		process.exit(1);
	}
	const subscriptionCount = await prisma.pushSubscription.count({
		where: { userId: user.id },
	});
	if (subscriptionCount === 0) {
		console.error(
			`User "${bggUsername}" has no push subscription - enable notifications in Settings first.`,
		);
		process.exit(1);
	}

	const now = Math.floor(Date.now() / 1000);

	// Seed the "before" state for this scenario, then build the "after"
	// state via the real parsing pipeline.
	let previous: PreviousItemState;
	if (scenario === "outbid") {
		previous = { currentBid: 5, isEnded: false };
	} else if (scenario === "newBid") {
		previous = { currentBid: null, isEnded: false };
	} else {
		previous = { currentBid: 10, isEnded: false };
	}

	await prisma.item.upsert({
		where: { id: TEST_ITEM_ID },
		create: {
			id: TEST_ITEM_ID,
			listId: TEST_LIST_ID,
			objectType: "thing",
			objectSubtype: "boardgame",
			objectId: 1,
			objectName: `TEST ITEM - ${scenario} flow`,
			username: scenario === "newBid" ? bggUsername : "owner",
			postDate: new Date(),
			postTimestamp: now,
			editDate: new Date(),
			editTimestamp: now,
			thumbs: 0,
			imageId: 1,
			body: "test",
			currentBid: previous.currentBid,
			highestBidder: previous.currentBid != null ? bggUsername : null,
			hasBids: previous.currentBid != null,
			isEnded: previous.isEnded,
			lastSeen: now,
		},
		update: {
			currentBid: previous.currentBid,
			highestBidder: previous.currentBid != null ? bggUsername : null,
			isEnded: previous.isEnded,
			deleted: false,
		},
	});
	const previousState = new Map([[TEST_ITEM_ID, previous]]);

	const xml = buildXml(scenario, bggUsername, scenario === "won");
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const source = parser.parse(xml)["item"];
	const item = ItemWrapper.fromXml(TEST_LIST_ID, source, now, 2024);

	console.log(`New highest bid: €${item.currentBid}, isEnded: ${item.isEnded}`);
	console.log(
		"Computed intents:",
		computeNotificationIntents([item], previousState),
	);

	await notifyBidUpdates([item], previousState);

	console.log("Sent. Check your device for exactly one notification.");
	process.exit(0);
};

run();
