import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

// "I don't want to see this on my Outbid & Liked page anymore" - see the
// UserDismissedItem schema comment. Independent of liking: dismissing an
// outbid item doesn't touch UserLikedItem, and /api/outbids filters these
// out directly rather than requiring a like (see backend/src/api/outbids).

// Busts /api/outbids' cache for this user so a dismiss/undismiss is
// reflected immediately instead of waiting out its 60s TTL - confirmed by
// hand this staleness is actually confusing in practice, not just
// theoretical. Silently skipped (not an error) if the item or the user's
// own bggUsername can't be resolved - same cache key /api/outbids itself
// builds.
const bustOutbidsCache = async (userId: number, itemId: number) => {
	const [item, user] = await Promise.all([
		prisma.item.findUnique({ where: { id: itemId }, select: { listId: true } }),
		prisma.user.findUnique({ where: { id: userId }, select: { bggUsername: true } }),
	]);
	if (!item || !user?.bggUsername) return;

	await redisClient.del(`api:outbid:${item.listId}:${user.bggUsername}:${userId}`);
};

// 🔹 Dismiss an item
router.post(
	"/:itemId",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		if (!req.userId) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		const itemId = +req.params.itemId;
		if (Number.isNaN(itemId)) {
			res.status(400).json({ error: "Invalid itemId" });
			return;
		}

		try {
			await prisma.userDismissedItem.upsert({
				where: { userId_itemId: { userId: req.userId, itemId } },
				update: {}, // nothing to update if it exists
				create: { userId: req.userId, itemId },
			});

			await bustOutbidsCache(req.userId, itemId);

			res.status(200).json({ success: true, dismissed: true });
		} catch (err) {
			console.error("Error dismissing item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// 🔹 Un-dismiss an item
router.delete(
	"/:itemId",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		if (!req.userId) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		const itemId = +req.params.itemId;
		if (Number.isNaN(itemId)) {
			res.status(400).json({ error: "Invalid itemId" });
			return;
		}

		try {
			await prisma.userDismissedItem.deleteMany({
				where: { userId: req.userId, itemId },
			});

			await bustOutbidsCache(req.userId, itemId);

			res.status(200).json({ success: true, dismissed: false });
		} catch (err) {
			console.error("Error un-dismissing item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
