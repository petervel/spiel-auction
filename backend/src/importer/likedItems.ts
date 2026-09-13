import prisma from "../prismaClient";

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
// lowercased username -> userIds. A value array rather than a single id
// because bggUsername isn't unique on User - two people can register the
// same BGG username, and both must get credited for the same bid.
export type UserByUsername = Map<string, number[]>;

// Pure: given the full current set of (item, bidder) pairs and a snapshot of
// which pairs already existed before this import cycle, works out which
// registered users just placed a bid for the first time on a given item and
// so should have it added to their liked items.
export const computeNewLikes = (
	currentPairs: BidderPair[],
	previousBidderKeys: Set<BidderKey>,
	userIdsByUsername: UserByUsername,
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

// Auto-likes an item for a registered user (matched by bggUsername) the
// first time they place a bid on it, so it still shows up on their "Outbid &
// Liked" page if they're later outbid - without them ever having pressed
// the heart themselves. Idempotent: re-bidding on an already-liked item is a
// no-op (unique constraint on UserLikedItem), and unliking it later is a
// deliberate user action this never undoes.
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

	const users = await prisma.user.findMany({
		where: { bggUsername: { in: newlyBidUsernames } },
		select: { id: true, bggUsername: true },
	});
	if (users.length === 0) return;

	const userIdsByUsername: UserByUsername = new Map();
	for (const u of users) {
		const key = u.bggUsername!.toLowerCase();
		const existing = userIdsByUsername.get(key);
		if (existing) existing.push(u.id);
		else userIdsByUsername.set(key, [u.id]);
	}

	const data = computeNewLikes(
		currentPairs,
		previousBidderKeys,
		userIdsByUsername,
		fairId,
	);
	if (data.length === 0) return;

	await prisma.userLikedItem.createMany({ data, skipDuplicates: true });
};
