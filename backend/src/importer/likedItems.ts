import prisma from "../prismaClient";
import { getConfirmedUserIdsByUsername, UserIdsByUsername } from "./verifiedUsers";

// `${itemId}:${lowercased bidder username}` - identifies one user having
// placed at least one real bid on one item.
type BidderKey = string;

const bidderKey = (itemId: number, username: string): BidderKey =>
	`${itemId}:${username.toLowerCase()}`;

export const getBidderKeys = async (listId: number): Promise<Set<BidderKey>> => {
	const bidderPairs = await prisma.itemComment.findMany({
		where: { listId, bid: { not: null } },
		select: { itemId: true, username: true },
	});

	return new Set(bidderPairs.map((p) => bidderKey(p.itemId, p.username)));
};

export type BidderPair = { itemId: number; username: string };

// Pure: given the full current set of (item, bidder) pairs and a snapshot of
// which pairs already existed before this import cycle, works out which
// registered users just placed a bid for the first time on a given item and
// so should have it added to their liked items.
export const computeNewLikes = (
	currentPairs: BidderPair[],
	previousBidderKeys: Set<BidderKey>,
	userIdsByUsername: UserIdsByUsername,
	fairId: number,
): { userId: number; itemId: number; fairId: number }[] => {
	const newPairs = currentPairs.filter(
		(p) => !previousBidderKeys.has(bidderKey(p.itemId, p.username)),
	);

	const likes: { userId: number; itemId: number; fairId: number }[] = [];
	for (const pair of newPairs) {
		const userIds = userIdsByUsername.get(pair.username.toLowerCase());
		if (!userIds) continue;
		for (const userId of userIds) {
			likes.push({ userId, itemId: pair.itemId, fairId });
		}
	}
	return likes;
};

// Auto-likes an item for every account with a confirmed BggVerification for
// the bidder's username the first time they place a bid on it, so it still
// shows up on their "Outbid & Liked" page if they're later outbid - without
// them ever having pressed the heart themselves. Idempotent: re-bidding on
// an already-liked item is a no-op (unique constraint on UserLikedItem),
// and unliking it later is a deliberate user action this never undoes.
export const likeItemsForNewBidders = async (
	fairId: number,
	listId: number,
	previousBidderKeys: Set<BidderKey>,
): Promise<void> => {
	const currentPairs = await prisma.itemComment.findMany({
		where: { listId, bid: { not: null } },
		select: { itemId: true, username: true },
	});

	const newlyBidUsernames = [
		...new Set(
			currentPairs
				.filter((p) => !previousBidderKeys.has(bidderKey(p.itemId, p.username)))
				.map((p) => p.username),
		),
	];
	if (newlyBidUsernames.length === 0) return;

	const userIdsByUsername = await getConfirmedUserIdsByUsername(
		newlyBidUsernames,
	);
	if (userIdsByUsername.size === 0) return;

	const data = computeNewLikes(
		currentPairs,
		previousBidderKeys,
		userIdsByUsername,
		fairId,
	);
	if (data.length === 0) return;

	await prisma.userLikedItem.createMany({ data, skipDuplicates: true });
};
