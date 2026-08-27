import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { ItemWrapper } from "../processors/ItemWrapper";

export const notifyOutbidBidders = async (
	items: ItemWrapper[],
	previousHighestBids: Map<number, number>,
) => {
	const changed = items
		.map((item) => ({ item, previous: previousHighestBids.get(item.id) }))
		.filter(
			(x): x is { item: ItemWrapper; previous: number } =>
				x.previous != null && (x.item.currentBid ?? 0) > x.previous,
		)
		.map(({ item, previous }) => ({
			item,
			bidders: item.getOutbidBidders(previous),
		}))
		.filter((x) => x.bidders.length > 0);

	if (changed.length === 0) return;

	// One query for the whole fair rather than one per item.
	const users = await prisma.user.findMany({
		where: { bggUsername: { not: null } },
	});
	const byUsername = new Map(
		users.map((user) => [user.bggUsername!.toLowerCase(), user]),
	);

	await Promise.all(
		changed.flatMap(({ item, bidders }) =>
			bidders
				.map((username) => byUsername.get(username.toLowerCase()))
				.filter((user) => user != null)
				.map((user) =>
					sendPushToUser(user.id, {
						title: item.objectName,
						body: `New highest bid: €${item.currentBid}`,
					}),
				),
		),
	);
};
