import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";
import { useListId } from "../useListId";

const LIST_ID = useListId();

const router = express.Router();

router.get("/:objectId", async (req, res) => {
	if (!req.params.objectId) {
		res.status(400).json({ error: "No objectId parameter provided." });
		return;
	}
	const objectId = +req.params.objectId;
	if (Number.isNaN(objectId)) {
		res.status(400).json({
			error: `Invalid objectId provided (must be a number): ${req.params.objectId}`,
		});
		return;
	}
	const cacheKey = `api:object:${objectId}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const items = await prisma.item.findMany({
		where: { listId: LIST_ID, objectId: objectId, deleted: false },
		orderBy: { postDate: "desc" },
	});

	await redisClient.set(cacheKey, JSON.stringify(items));
	await redisClient.expire(cacheKey, 30);

	res.status(200).json(items);
});

export default router;
