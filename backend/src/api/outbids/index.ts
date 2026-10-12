import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { listNotFoundError } from "../listLookup";
import { redisClient } from "../redisClient";

const router = express.Router();

router.get("/", (_, res) => {
	res.status(400).json({ error: "No listId parameter provided." });
});

// Authenticated (unlike most list-scoped GETs) because results are
// per-viewer: an outbid item the caller has dismissed (see
// backend/src/api/dismissed) is filtered out, and two different accounts
// can share one bidder username (see usersByBggUsername.ts) with different
// dismissals - req.userId, not just the bidder param, affects the result.
router.get(
	"/:listId",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const listId = +req.params.listId;
		if (Number.isNaN(listId)) {
			res.status(400).json({
				error: `Invalid listId provided (must be a number): ${req.params.listId}`,
			});
			return;
		}
		if (!req.query.bidder) {
			res.status(400).json({ error: "No listId bidder provided." });
			return;
		}

		const bidder = req.query.bidder as string;

		const cacheKey = `api:outbid:${listId}:${bidder}:${req.userId}`;
		const cache = await redisClient.get(cacheKey);
		if (cache) {
			res.status(200).json(JSON.parse(cache));
			return;
		}

		const list = await prisma.list.findUnique({ where: { id: listId } });
		if (!list) {
			res.status(404).json(await listNotFoundError(listId));
			return;
		}

		const items = await prisma.item.findMany({
			where: {
				listId: listId,
				deleted: false,
				comments: {
					some: {
						oldBid: { not: null },
						username: bidder,
						deleted: false,
					},
				},
			},
			include: {
				comments: true,
				dismissedByUsers: { where: { userId: req.userId } },
			},
		});

		const result = {
			items: items.filter((item) => {
				if (item.highestBidder?.toLowerCase() === bidder.toLowerCase()) {
					return false;
				}

				const dismissal = item.dismissedByUsers[0];
				if (!dismissal) return true;

				// A dismissal only covers the fight as it stood at the time -
				// if the bidder has placed a new bid on this item since, they're
				// back in it, and the old "don't show me this" no longer holds.
				const rebidSinceDismissal = item.comments.some(
					(comment) =>
						comment.username === bidder &&
						!comment.deleted &&
						comment.oldBid !== null &&
						comment.postDate > dismissal.dismissedAt,
				);
				return rebidSinceDismissal;
			}),
		};

		await redisClient.set(cacheKey, JSON.stringify(result));
		await redisClient.expire(cacheKey, 60);

		res.status(200).json(result);
	},
);

export default router;
