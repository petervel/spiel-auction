import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { ItemWrapper } from "../processors/ItemWrapper";
import { findNewlyListedItems, PreviousItemState } from "./notificationIntents";

export const notifyWishlistedItems = async (
	items: ItemWrapper[],
	previousState: Map<number, PreviousItemState>,
) => {
	const newItems = findNewlyListedItems(items, previousState);
	if (newItems.length === 0) return;

	const objectIds = [...new Set(newItems.map((item) => item.objectId))];

	const wishlisted = await prisma.userWishlistItem.findMany({
		where: {
			objectId: { in: objectIds },
			user: { notifyOnWishlistItemListed: true },
		},
		select: { userId: true, objectId: true },
	});
	if (wishlisted.length === 0) return;

	const itemsByObjectId = new Map<number, ItemWrapper[]>();
	for (const item of newItems) {
		const existing = itemsByObjectId.get(item.objectId);
		if (existing) existing.push(item);
		else itemsByObjectId.set(item.objectId, [item]);
	}

	await Promise.all(
		wishlisted.flatMap(({ userId, objectId }) =>
			(itemsByObjectId.get(objectId) ?? []).map((item) =>
				sendPushToUser(userId, {
					title: "New listing for your wishlist",
					body: `${item.objectName} was just listed for auction`,
					icon: "/icon/notify-wishlist.svg",
					url: `/item/${item.id}`,
				}),
			),
		),
	);
};
