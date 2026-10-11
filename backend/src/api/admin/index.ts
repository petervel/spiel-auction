import express from "express";
import prisma from "../../prismaClient";
import {
	AuthenticatedRequest,
	authenticateUser,
	EMULATED_USER_COOKIE,
	requireAdmin,
} from "../../../middleware/auth";

const router = express.Router();

const EMULATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Monitoring overview for the admin's own currently-selected fair (the
// same "current fair" everything else in the app uses) - everything here
// is scoped to that one fair, not the whole install, so switching fairs
// (Settings > Fair) changes what this shows.
router.get(
	"/stats",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const fair = req.user?.currentUserFair?.fair;
			const fairId = req.user?.currentUserFair?.fairId;
			const listId = fair?.listId;

			if (!fairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			const [
				activeUsers,
				usersWithLocationSquare,
				items,
				meetupCount,
				meetupCompletedCount,
				likeCount,
				fairUsers,
			] = await Promise.all([
				prisma.userFair.count({ where: { fairId } }),
				prisma.userFair.count({
					where: { fairId, locationSquare: { not: null } },
				}),
				listId
					? prisma.item.findMany({
							where: { listId, deleted: false },
							select: {
								hasBids: true,
								isEnded: true,
								username: true,
								highestBidder: true,
								currentBid: true,
							},
						})
					: Promise.resolve([]),
				prisma.meetup.count({ where: { fairId } }),
				prisma.meetup.count({ where: { fairId, completed: true } }),
				prisma.userLikedItem.count({ where: { fairId } }),
				prisma.user.findMany({
					where: { fairs: { some: { fairId } } },
					select: {
						bggUsername: true,
						bggVerifications: {
							where: { confirmed: true },
							select: { bggUsername: true },
						},
					},
				}),
			]);

			const itemsWithBids = items.filter((item) => item.hasBids);
			const sellers = new Set(
				itemsWithBids.map((item) => item.username.toLowerCase()),
			);
			const bidders = new Set(
				itemsWithBids
					.map((item) => item.highestBidder?.toLowerCase())
					.filter((username): username is string => !!username),
			);
			const totalBidValue = itemsWithBids.reduce(
				(sum, item) => sum + (item.currentBid ?? 0),
				0,
			);
			const endedAuctions = itemsWithBids.filter(
				(item) => item.isEnded,
			).length;

			const usersWithBggUsername = fairUsers.filter(
				(user) => !!user.bggUsername,
			).length;
			const usersWithConfirmedBgg = fairUsers.filter(
				(user) =>
					user.bggUsername &&
					user.bggVerifications.some(
						(v) => v.bggUsername === user.bggUsername,
					),
			).length;

			res.status(200).json({
				fairName: fair?.name ?? null,
				lastUpdated: fair?.lastUpdated ?? null,
				lastResult: fair?.lastResult ?? null,
				activeUsers,
				usersWithBggUsername,
				usersWithConfirmedBgg,
				usersWithLocationSquare,
				totalItems: items.length,
				itemsWithBids: itemsWithBids.length,
				endedAuctions,
				distinctSellers: sellers.size,
				distinctBidders: bidders.size,
				totalBidValue,
				meetupCount,
				meetupCompletedCount,
				likeCount,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.get(
	"/users/search",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const query =
				typeof req.query.bggUsername === "string"
					? req.query.bggUsername.trim()
					: "";
			if (query.length < 2) {
				return res
					.status(400)
					.json({ error: "Search for at least 2 characters." });
			}

			const users = await prisma.user.findMany({
				where: { bggUsername: { contains: query } },
				select: {
					id: true,
					bggUsername: true,
					createdAt: true,
					accessLevel: true,
					bggVerifications: {
						where: { confirmed: true },
						select: { bggUsername: true },
					},
				},
				orderBy: { bggUsername: "asc" },
				take: 20,
			});

			return res.json({
				users: users.map(({ bggVerifications, ...user }) => ({
					...user,
					verified: bggVerifications.some(
						(v) => v.bggUsername === user.bggUsername,
					),
				})),
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/emulate",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		const userId = Number(req.body?.userId);
		if (!Number.isInteger(userId)) {
			return res.status(400).json({ error: "userId is required" });
		}
		if (userId === req.realUser?.id) {
			return res
				.status(400)
				.json({ error: "You can't emulate yourself." });
		}

		const target = await prisma.user.findUnique({ where: { id: userId } });
		if (!target) {
			return res.status(404).json({ error: "User not found" });
		}

		res.cookie(EMULATED_USER_COOKIE, String(userId), {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: EMULATION_MAX_AGE_MS,
		});
		return res.json({ emulating: true, userId });
	},
);

router.delete(
	"/emulate",
	authenticateUser,
	requireAdmin,
	(_req: AuthenticatedRequest, res) => {
		res.clearCookie(EMULATED_USER_COOKIE, { path: "/" });
		return res.json({ emulating: false });
	},
);

export default router;
