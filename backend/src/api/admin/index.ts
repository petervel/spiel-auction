import { FairStatus, Prisma } from "@prisma/client";
import express from "express";
import prisma from "../../prismaClient";
import {
	AuthenticatedRequest,
	authenticateUser,
	EMULATED_USER_COOKIE,
	requireAdmin,
} from "../../../middleware/auth";
import { sendPushToUser } from "../../push/webPushClient";
import { redisClient } from "../redisClient";

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
				// "Completed" here means both sides agree it's done, not just
				// one - completed is now per-side (buyerCompleted/
				// sellerCompleted), so either alone would overcount.
				prisma.meetup.count({
					where: { fairId, buyerCompleted: true, sellerCompleted: true },
				}),
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
						// Trimmed/lowercased - see usersByBggUsername.ts for why a
						// legacy BggVerification row can carry whitespace a plain
						// JS === won't forgive the way MySQL's collation does.
						(v) =>
							v.bggUsername?.trim().toLowerCase() ===
							user.bggUsername?.trim().toLowerCase(),
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
					// Trimmed/lowercased - see usersByBggUsername.ts for why a
					// legacy BggVerification row can carry whitespace a plain
					// JS === won't forgive the way MySQL's collation does.
					verified: bggVerifications.some(
						(v) =>
							v.bggUsername?.trim().toLowerCase() ===
							user.bggUsername?.trim().toLowerCase(),
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

// Fans out a push notification to every user who hasn't opted out (see
// User.notifyOnAdminBroadcast) - same sendPushToUser/Promise.all pattern
// every other notifier in this codebase uses, just across the whole
// install rather than one triggering event's own target users. The
// frontend is expected to confirm with the admin before calling this -
// there's no undo once it's fanned out.
router.post(
	"/broadcast",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { title, body, url } = req.body;

			if (typeof title !== "string" || !title.trim()) {
				res.status(400).json({ error: "title is required" });
				return;
			}
			if (typeof body !== "string" || !body.trim()) {
				res.status(400).json({ error: "body is required" });
				return;
			}
			if (url !== undefined && typeof url !== "string") {
				res.status(400).json({ error: "url must be a string" });
				return;
			}

			// Eligible (notifyOnAdminBroadcast) alone overcounts hugely - most
			// users have never enabled push at all, so sendPushToUser is a
			// silent no-op for them (zero PushSubscription rows). Requiring at
			// least one subscription makes the reported count mean "actually
			// got a push attempt", not just "didn't opt out".
			const recipients = await prisma.user.findMany({
				where: {
					notifyOnAdminBroadcast: true,
					PushSubscription: { some: {} },
				},
				select: { id: true },
			});

			await Promise.all(
				recipients.map((recipient) =>
					sendPushToUser(recipient.id, {
						title: title.trim(),
						body: body.trim(),
						url: url?.trim() || undefined,
					}),
				),
			);

			res.status(200).json({ sentToUsers: recipients.length });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// GET /api/fairs also serves admins the full list (see fairs/index.ts),
// but that endpoint is "what fairs can I switch into" for every logged-in
// user - this is the dedicated admin-management read/write surface, kept
// separate so one isn't pulling double duty.
const FAIR_STATUSES = new Set(Object.values(FairStatus));

const invalidateFairsCache = async () => {
	await redisClient.del("api:fairs:admin", "api:fairs:normal");
};

router.get(
	"/fairs",
	authenticateUser,
	requireAdmin,
	async (_req: AuthenticatedRequest, res) => {
		try {
			const fairs = await prisma.fair.findMany({
				orderBy: { id: "desc" },
			});
			res.status(200).json({ fairs });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/fairs",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { name, geeklistId, eventDate, status, hidden } = req.body;

			if (typeof name !== "string" || !name.trim()) {
				res.status(400).json({ error: "name is required" });
				return;
			}
			const parsedGeeklistId = Number(geeklistId);
			if (!Number.isInteger(parsedGeeklistId)) {
				res.status(400).json({
					error: "geeklistId is required and must be an integer",
				});
				return;
			}
			const parsedEventDate = new Date(eventDate);
			if (Number.isNaN(parsedEventDate.getTime())) {
				res.status(400).json({ error: "eventDate is required" });
				return;
			}
			if (status !== undefined && !FAIR_STATUSES.has(status)) {
				res.status(400).json({
					error: `status must be one of ${[...FAIR_STATUSES].join(", ")}`,
				});
				return;
			}
			if (hidden !== undefined && typeof hidden !== "boolean") {
				res.status(400).json({ error: "hidden must be a boolean" });
				return;
			}

			const fair = await prisma.fair.create({
				data: {
					name: name.trim(),
					geeklistId: parsedGeeklistId,
					eventDate: parsedEventDate,
					status: status ?? FairStatus.ACTIVE,
					hidden: hidden ?? false,
				},
			});

			await invalidateFairsCache();
			res.status(201).json({ fair });
		} catch (err) {
			if (
				err instanceof Prisma.PrismaClientKnownRequestError &&
				err.code === "P2002"
			) {
				res.status(400).json({
					error: "A fair with that name or geeklist id already exists.",
				});
				return;
			}
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.patch(
	"/fairs/:id",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const id = Number(req.params.id);
			if (Number.isNaN(id)) {
				res.status(400).json({ error: "Invalid fair id" });
				return;
			}

			const { name, geeklistId, eventDate, status, hidden } = req.body;
			const data: Prisma.FairUpdateInput = {};

			if (name !== undefined) {
				if (typeof name !== "string" || !name.trim()) {
					res.status(400).json({ error: "name must be a string" });
					return;
				}
				data.name = name.trim();
			}
			if (geeklistId !== undefined) {
				const parsedGeeklistId = Number(geeklistId);
				if (!Number.isInteger(parsedGeeklistId)) {
					res.status(400).json({
						error: "geeklistId must be an integer",
					});
					return;
				}
				data.geeklistId = parsedGeeklistId;
			}
			if (eventDate !== undefined) {
				const parsedEventDate = new Date(eventDate);
				if (Number.isNaN(parsedEventDate.getTime())) {
					res.status(400).json({ error: "eventDate is invalid" });
					return;
				}
				data.eventDate = parsedEventDate;
			}
			if (status !== undefined) {
				if (!FAIR_STATUSES.has(status)) {
					res.status(400).json({
						error: `status must be one of ${[...FAIR_STATUSES].join(", ")}`,
					});
					return;
				}
				data.status = status;
			}
			if (hidden !== undefined) {
				if (typeof hidden !== "boolean") {
					res.status(400).json({ error: "hidden must be a boolean" });
					return;
				}
				data.hidden = hidden;
			}

			const fair = await prisma.fair.update({ where: { id }, data });

			await invalidateFairsCache();
			res.status(200).json({ fair });
		} catch (err) {
			if (err instanceof Prisma.PrismaClientKnownRequestError) {
				if (err.code === "P2002") {
					res.status(400).json({
						error: "A fair with that name or geeklist id already exists.",
					});
					return;
				}
				if (err.code === "P2025") {
					res.status(404).json({ error: "Fair not found" });
					return;
				}
			}
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
