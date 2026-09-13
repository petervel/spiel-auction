import { User } from "@prisma/client";
import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { ItemWrapper } from "../processors/ItemWrapper";
import {
	computeNotificationIntents,
	NotificationIntent,
	NotificationType,
	PreviousItemState,
} from "./notificationIntents";

const PREFERENCE_FIELD: Record<
	NotificationType,
	"notifyOnOutbid" | "notifyOnNewBid" | "notifyOnAuctionWon"
> = {
	outbid: "notifyOnOutbid",
	newBid: "notifyOnNewBid",
	won: "notifyOnAuctionWon",
};

const buildPayload = ({ item, type }: NotificationIntent) => {
	const url = `/item/${item.id}`;
	switch (type) {
		case "outbid":
			return {
				title: "You've been outbid",
				body: `The new highest bid for ${item.objectName} is now €${item.currentBid}`,
				icon: "/icon/notify-outbid.svg",
				url,
			};
		case "newBid":
			return {
				title: `Someone bid on ${item.objectName}`,
				body: `Current bid is now €${item.currentBid}`,
				icon: "/icon/notify-newbid.svg",
				url,
			};
		case "won":
			return {
				title: "You won an auction!",
				body: `You've won the auction for ${item.objectName} for €${item.currentBid}`,
				icon: "/icon/notify-won.svg",
				url,
			};
	}
};

export const notifyBidUpdates = async (
	items: ItemWrapper[],
	previousState: Map<number, PreviousItemState>,
) => {
	const intents = computeNotificationIntents(items, previousState);
	if (intents.length === 0) return;

	// One query for the whole fair rather than one per item.
	const users = await prisma.user.findMany({
		where: { bggUsername: { not: null } },
	});

	// lowercased username -> users. A list rather than a single user because
	// bggUsername isn't unique on User - two people can register the same
	// BGG username, and both must be notified about the same bid.
	const byUsername = new Map<string, User[]>();
	for (const user of users) {
		const key = user.bggUsername!.toLowerCase();
		const existing = byUsername.get(key);
		if (existing) existing.push(user);
		else byUsername.set(key, [user]);
	}

	await Promise.all(
		intents.flatMap((intent) =>
			(byUsername.get(intent.username.toLowerCase()) ?? [])
				.filter((user) => user[PREFERENCE_FIELD[intent.type]])
				.map((user) => sendPushToUser(user.id, buildPayload(intent))),
		),
	);
};
