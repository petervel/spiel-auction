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
	const userId = req.userId;
	const cacheKey = `api:starred:${userId}`;

	console.log("Fetching starred items for userId:", userId);
	// Check cache
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	if (!req.user?.currentUserFairId) {
		res.status(400).json({ error: "No fair selected" });
		return;
	}

	if (!userId) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const starredItems = await prisma.userStarredItem.findMany({
		where: { userId, fairId: req.user?.currentUserFair?.fairId },
		include: { item: true },
		orderBy: { itemId: "desc" },
	});

	console.log("Found starred items:", starredItems.length);

	const result = starredItems.map((star) => star.item);

	console.log("Returning items:", result.length);

	// Cache
	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

// 🔹 Get IDs of starred items for logged in user
router.get("/ids", authenticateUser, async (req: AuthenticatedRequest, res) => {
	if (!req.userId) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const userId = req.userId;
	const cacheKey = `api:starred:ids:${userId}`;

	// Check cache
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const items = await prisma.userStarredItem.findMany({
		select: { itemId: true },
		where: { userId },
		orderBy: { itemId: "desc" },
	});

	const result = items.map((i) => i.itemId);

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

		if (!req.user?.currentUserFairId) {
			res.status(400).json({ error: "No fair selected" });
			return;
		}

		try {
			const star = await prisma.userStarredItem.upsert({
				where: { userId_itemId: { userId: req.userId, itemId } },
				update: {}, // nothing to update if it exists
				create: {
					userId: req.userId,
					itemId,
					fairId: req.user.currentUserFair.fairId,
				},
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
