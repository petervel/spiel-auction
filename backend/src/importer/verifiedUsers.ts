import prisma from "../prismaClient";

// lowercased bggUsername -> userIds. A value array rather than a single id
// because bggUsername isn't unique - two different app accounts can each
// independently verify the same real BGG account (e.g. a couple sharing
// one), and both must be credited/notified for the same bid.
export type UserIdsByUsername = Map<string, number[]>;

// The source of truth for "which app accounts are this BGG username" is
// BggVerification (confirmed only), not User.bggUsername - that field is
// just whatever a user currently has typed into Settings, which can go
// unconfirmed or get changed/cleared without losing an earlier
// verification (see BggVerification's own schema comment). Matching on
// User.bggUsername instead would silently drop a still-legitimate account
// the moment its current claim no longer matches.
export const getConfirmedUserIdsByUsername = async (
	usernames: string[],
): Promise<UserIdsByUsername> => {
	const result: UserIdsByUsername = new Map();
	if (usernames.length === 0) return result;

	const verifications = await prisma.bggVerification.findMany({
		where: { bggUsername: { in: usernames }, confirmed: true },
		select: { userId: true, bggUsername: true },
	});

	for (const { userId, bggUsername } of verifications) {
		const key = bggUsername.toLowerCase();
		const existing = result.get(key);
		if (existing) existing.push(userId);
		else result.set(key, [userId]);
	}

	return result;
};
