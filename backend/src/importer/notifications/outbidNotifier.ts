import { User } from "@prisma/client";
import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { ItemWrapper } from "../processors/ItemWrapper";
import { getConfirmedUserIdsByUsername } from "../verifiedUsers";
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

	// Confirmed-verification-based, not User.bggUsername - see
	// verifiedUsers.ts. A username can map to several accounts (two people
	// verifying the same real BGG account), and all of them must be notified.
	const usernames = [...new Set(intents.map((intent) => intent.username))];
	const userIdsByUsername = await getConfirmedUserIdsByUsername(usernames);
	const allUserIds = [...new Set([...userIdsByUsername.values()].flat())];
	if (allUserIds.length === 0) return;

	// One query for the whole fair rather than one per item.
	const users = await prisma.user.findMany({
		where: { id: { in: allUserIds } },
	});
	const usersById = new Map(users.map((user) => [user.id, user]));

	await Promise.all(
		intents.flatMap((intent) => {
			const userIds =
				userIdsByUsername.get(intent.username.toLowerCase()) ?? [];
			return userIds
				.map((id) => usersById.get(id))
				.filter(
					(user): user is User =>
						!!user && user[PREFERENCE_FIELD[intent.type]],
				)
				.map((user) => sendPushToUser(user.id, buildPayload(intent)));
		}),
	);
};
