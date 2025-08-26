import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

// 🔹 Get all starred items for logged in user
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
	if (!req.userId) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const userId = req.userId;
	const cacheKey = `api:starred:${userId}`;

	// Check cache
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const starredItems = await prisma.userStarredItem.findMany({
		where: { userId },
		include: { item: true },
	});

	const result = starredItems.map((star) => ({
		...star.item,
		starred: true,
	}));

	// Cache
	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

// 🔹 Star an item
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
			const star = await prisma.userStarredItem.upsert({
				where: { userId_itemId: { userId: req.userId, itemId } },
				update: {}, // nothing to update if it exists
				create: { userId: req.userId, itemId },
			});

			// Bust cache
			await redisClient.del(`api:starred:${req.userId}`);

			res.status(200).json({ success: true, starred: true, star });
		} catch (err) {
			console.error("Error starring item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// 🔹 Unstar an item
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
			await prisma.userStarredItem.deleteMany({
				where: { userId: req.userId, itemId },
			});

			// Bust cache
			await redisClient.del(`api:starred:${req.userId}`);

			res.status(200).json({ success: true, starred: false });
		} catch (err) {
			console.error("Error unstarring item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
