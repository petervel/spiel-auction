import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

// 🔹 Get all liked items for logged in user
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
	const userId = req.userId;
	const fairId = req.user?.currentUserFair?.fairId;
	const cacheKey = `api:liked:${userId}:${fairId}`;

	// console.log("Fetching liked items for userId:", userId);
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

	const likedItems = await prisma.userLikedItem.findMany({
		where: { userId, fairId },
		include: { item: true },
		orderBy: { itemId: "desc" },
	});

	// console.log("Found liked items:", likedItems.length);

	const result = { items: likedItems.map((like) => like.item) };

	// console.log("Returning items:", result.length);

	// Cache
	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

// 🔹 Get IDs of liked items for logged in user
router.get("/ids", authenticateUser, async (req: AuthenticatedRequest, res) => {
	if (!req.userId) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const userId = req.userId;
	const fairId = req.user?.currentUserFair?.fairId;
	const cacheKey = `api:liked:ids:${userId}:${fairId}`;

	// Check cache
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const items = await prisma.userLikedItem.findMany({
		select: { itemId: true },
		where: { userId, fairId },
		orderBy: { itemId: "desc" },
	});

	const result = items.map((i) => i.itemId);

	// Cache
	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

// 🔹 Like an item
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
			const like = await prisma.userLikedItem.upsert({
				where: { userId_itemId: { userId: req.userId, itemId } },
				update: {}, // nothing to update if it exists
				create: {
					userId: req.userId,
					itemId,
					fairId: req.user.currentUserFair.fairId,
				},
			});

			// Bust cache
			await redisClient.del(
				`api:liked:${req.userId}:${req.user?.currentUserFair?.fairId}`,
			);

			res.status(200).json({ success: true, liked: true, like });
		} catch (err) {
			console.error("Error liking item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// 🔹 Unlike an item
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
			await prisma.userLikedItem.deleteMany({
				where: { userId: req.userId, itemId },
			});

			// Bust cache
			await redisClient.del(
				`api:liked:${req.userId}:${req.user?.currentUserFair?.fairId}`,
			);

			res.status(200).json({ success: true, liked: false });
		} catch (err) {
			console.error("Error unliking item:", err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
