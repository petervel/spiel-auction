import prisma from "../prismaClient";

// lowercased bggUsername -> userIds. A value array rather than a single id
// because bggUsername isn't unique - two different app accounts can each
// independently claim (verified or not) the same real BGG account (e.g. a
// couple sharing one), and all of them must be credited/notified for the
// same bid.
export type UserIdsByUsername = Map<string, number[]>;

// Union of two sources, since either alone misses accounts:
// - BggVerification (confirmed): durable even if the account's current
//   User.bggUsername claim has since changed or been cleared (see
//   BggVerification's own schema comment).
// - User.bggUsername: catches an account that's claimed the username in
//   Settings but never completed verification - missing a legitimate
//   credit/notification is worse than crediting/notifying an unverified
//   claim.
export const getUserIdsByUsername = async (
	usernames: string[],
): Promise<UserIdsByUsername> => {
	const result: UserIdsByUsername = new Map();
	if (usernames.length === 0) return result;

	const addToGroup = (bggUsername: string, userId: number) => {
		const key = bggUsername.toLowerCase();
		const existing = result.get(key);
		if (existing) {
			if (!existing.includes(userId)) existing.push(userId);
		} else {
			result.set(key, [userId]);
		}
	};

	const [verifications, claimants] = await Promise.all([
		prisma.bggVerification.findMany({
			where: { bggUsername: { in: usernames }, confirmed: true },
			select: { userId: true, bggUsername: true },
		}),
		prisma.user.findMany({
			where: { bggUsername: { in: usernames } },
			select: { id: true, bggUsername: true },
		}),
	]);

	for (const { userId, bggUsername } of verifications) {
		addToGroup(bggUsername, userId);
	}
	for (const { id, bggUsername } of claimants) {
		addToGroup(bggUsername!, id);
	}

	return result;
};
