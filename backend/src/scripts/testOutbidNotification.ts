// Manual QA script for the outbid-notification flow, since it ends in a
// real device notification that nothing automated can verify. Seeds a
// fake item where BGGUSERNAME is currently winning at 5, then runs the
// exact same ItemWrapper/notifyOutbidBidders code path the importer uses
// against a synthetic update where someone else takes the lead - proving
// both that a notification fires and that it fires exactly once, even
// though BGGUSERNAME placed two now-superseded bids in the window.
//
// Usage (from inside the backend container, or via ts-node locally):
//   BGGUSERNAME=petervel npx ts-node src/scripts/testOutbidNotification.ts
//
// Requires: a User row with bggUsername=BGGUSERNAME and an active
// PushSubscription (i.e. you've clicked "Enable notifications" in
// Settings while logged in as that user), and the 305536 test List
// already existing in the DB (created by any prior import of geeklist
// 305536 - the "Auction Test" fair uses it).
import dotenv from "dotenv";
dotenv.config();

import { XMLParser } from "fast-xml-parser";
import { notifyOutbidBidders } from "../importer/notifications/outbidNotifier";
import { ItemWrapper } from "../importer/processors/ItemWrapper";
import prisma from "../prismaClient";

const TEST_ITEM_ID = 999999999;
const TEST_LIST_ID = 305536;

const run = async () => {
	const bggUsername = process.env.BGGUSERNAME;
	if (!bggUsername) {
		console.error("Set BGGUSERNAME to the bggUsername to test as.");
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

	// Seed the "before" state: bggUsername is currently winning at €5.
	const now = Math.floor(Date.now() / 1000);
	await prisma.item.upsert({
		where: { id: TEST_ITEM_ID },
		create: {
			id: TEST_ITEM_ID,
			listId: TEST_LIST_ID,
			objectType: "thing",
			objectSubtype: "boardgame",
			objectId: 1,
			objectName: "TEST ITEM - outbid flow",
			username: "owner",
			postDate: new Date(),
			postTimestamp: now,
			editDate: new Date(),
			editTimestamp: now,
			thumbs: 0,
			imageId: 1,
			body: "test",
			currentBid: 5,
			highestBidder: bggUsername,
			hasBids: true,
			lastSeen: now,
		},
		update: { currentBid: 5, highestBidder: bggUsername, deleted: false },
	});
	const previousHighestBids = new Map([[TEST_ITEM_ID, 5]]);

	// Build the "after" state via the real parsing pipeline: bggUsername
	// bids twice (€5, then €7 - both now superseded), then someoneelse
	// takes the lead at €10.
	const xml = `<item id="${TEST_ITEM_ID}" objecttype="thing" subtype="boardgame" objectid="1" objectname="TEST ITEM - outbid flow" username="owner" postdate="Wed, 19 Oct 2022 11:32:50 +0000" editdate="Wed, 19 Oct 2022 11:42:50 +0000" thumbs="0" imageid="1">
	<body>Test body</body>
	<comment username="${bggUsername}" date="Wed, 24 Apr 2024 14:46:25 +0000" postdate="Wed, 24 Apr 2024 14:46:25 +0000" editdate="Wed, 24 Apr 2024 14:46:25 +0000" thumbs="0">
€5
</comment>
	<comment username="${bggUsername}" date="Wed, 24 Apr 2024 14:47:25 +0000" postdate="Wed, 24 Apr 2024 14:47:25 +0000" editdate="Wed, 24 Apr 2024 14:47:25 +0000" thumbs="0">
€7
</comment>
	<comment username="someoneelse" date="Wed, 24 Apr 2024 14:48:25 +0000" postdate="Wed, 24 Apr 2024 14:48:25 +0000" editdate="Wed, 24 Apr 2024 14:48:25 +0000" thumbs="0">
€10
</comment>
</item>`;

	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const source = parser.parse(xml)["item"];
	const item = ItemWrapper.fromXml(TEST_LIST_ID, source, now, 2024);

	console.log(`New highest bid: €${item.currentBid}`);
	console.log(`Outbid bidders (should be exactly ["${bggUsername}"]):`, item.getOutbidBidders(5));

	await notifyOutbidBidders([item], previousHighestBids);

	console.log("Sent. Check your device for exactly one notification.");
	process.exit(0);
};

run();
