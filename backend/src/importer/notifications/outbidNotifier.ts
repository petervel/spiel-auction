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
	switch (type) {
		case "outbid":
			return {
				title: item.objectName,
				body: `New highest bid: €${item.currentBid}`,
			};
		case "newBid":
			return { title: item.objectName, body: `New bid: €${item.currentBid}` };
		case "won":
			return {
				title: item.objectName,
				body: `You won! Final bid: €${item.currentBid}`,
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
	const byUsername = new Map(
		users.map((user) => [user.bggUsername!.toLowerCase(), user]),
	);

	await Promise.all(
		intents
			.map((intent) => ({
				intent,
				user: byUsername.get(intent.username.toLowerCase()),
			}))
			.filter(
				(x): x is { intent: NotificationIntent; user: User } =>
					x.user != null && x.user[PREFERENCE_FIELD[x.intent.type]],
			)
			.map((x) => sendPushToUser(x.user.id, buildPayload(x.intent))),
	);
};
