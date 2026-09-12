import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

// A single auction listing by its own id (globally unique, unlike
// objectId which repeats across every auction of the same game) - used by
// the single-item page that push notifications (outbid/newBid/won/wishlist
// listing) link to.
router.get("/:itemId", async (req, res) => {
	const itemId = +req.params.itemId;
	if (Number.isNaN(itemId)) {
		res.status(400).json({
			error: `Invalid itemId provided (must be a number): ${req.params.itemId}`,
		});
		return;
	}

	const cacheKey = `api:item:${itemId}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const item = await prisma.item.findFirst({
		where: { id: itemId, deleted: false },
	});

	if (!item) {
		res.status(404).json({ error: `No item found with id ${itemId}` });
		return;
	}

	await redisClient.set(cacheKey, JSON.stringify(item));
	await redisClient.expire(cacheKey, 30);

	res.status(200).json(item);
});

export default router;
