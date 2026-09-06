// One-time backfill for the "bidding auto-likes an item" feature
// (see backend/src/importer/likedItems.ts): that hook only catches bids
// placed from here on, so this fills in the gap for every bid a registered
// user has ever placed, win or lose, ended or not - otherwise their
// "Outbid & Liked" page would be missing items they were already outbid on
// before this feature existed.
//
// Safe to re-run: UserLikedItem has a unique (userId, itemId) constraint
// and this uses skipDuplicates, so it only ever adds missing rows.
//
// Usage (from inside the backend container, or via ts-node locally):
//   npx ts-node src/scripts/backfillLikedItemsFromBids.ts
import dotenv from "dotenv";
dotenv.config();

import prisma from "../prismaClient";

async function run() {
	const users = await prisma.user.findMany({
		where: { bggUsername: { not: null } },
		select: { id: true, bggUsername: true },
	});

	let totalInserted = 0;

	for (const user of users) {
		const bidItems = await prisma.item.findMany({
			where: {
				comments: { some: { bid: { not: null }, username: user.bggUsername! } },
			},
			select: { id: true, list: { select: { fair: { select: { id: true } } } } },
		});

		const data = bidItems
			.filter((item) => item.list.fair !== null)
			.map((item) => ({
				userId: user.id,
				itemId: item.id,
				fairId: item.list.fair!.id,
			}));

		if (data.length === 0) continue;

		const result = await prisma.userLikedItem.createMany({
			data,
			skipDuplicates: true,
		});
		totalInserted += result.count;
		console.log(
			`User ${user.id} (${user.bggUsername}): +${result.count} liked items backfilled`,
		);
	}

	console.log(`Done. Total inserted: ${totalInserted}`);
}

run()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
