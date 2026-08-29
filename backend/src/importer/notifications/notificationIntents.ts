import { ItemWrapper } from "../processors/ItemWrapper";

// Pure diffing logic, kept in its own module with no push/DB imports so it
// stays importable in tests without pulling in webPushClient's eager VAPID
// setup (which throws if the env vars it needs aren't set).

export type NotificationType = "outbid" | "newBid" | "won";

export type NotificationIntent = {
	username: string;
	type: NotificationType;
	item: ItemWrapper;
};

export type PreviousItemState = {
	currentBid: number | null;
	isEnded: boolean;
};

export const computeNotificationIntents = (
	items: ItemWrapper[],
	previousState: Map<number, PreviousItemState>,
): NotificationIntent[] => {
	const intents: NotificationIntent[] = [];

	for (const item of items) {
		const previous = previousState.get(item.id);
		if (!previous) continue; // brand new item this cycle, nothing to diff

		const hadPreviousBid = previous.currentBid != null;
		const bidIncreased =
			hadPreviousBid &&
			item.currentBid != null &&
			item.currentBid > previous.currentBid!;

		if (bidIncreased) {
			for (const bidder of item.getOutbidBidders(previous.currentBid!)) {
				intents.push({ username: bidder, type: "outbid", item });
			}
		}

		// A new bid landed this cycle: either the very first bid ever on
		// this item, or a higher bid than before - both mean the seller
		// should hear about it. Gated on highestBidder existing rather
		// than currentBid alone, since a seller editing "Starting bid: 10"
		// -> "15" in the body bumps currentBid with zero real bids.
		if (item.highestBidder && (!hadPreviousBid || bidIncreased)) {
			intents.push({ username: item.username, type: "newBid", item });
		}

		if (
			!previous.isEnded &&
			item.isEnded &&
			item.highestBidder &&
			item.currentBid != null
		) {
			intents.push({ username: item.highestBidder, type: "won", item });
		}
	}

	return intents;
};
