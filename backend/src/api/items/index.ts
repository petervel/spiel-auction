import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

const MAX_RESULTS = 100;

router.get("/", (_, res) => {
	return res.status(400).json({ error: "No listId parameter provided." });
});

router.get("/:listId", async (req, res) => {
	if (!req.params.listId) {
		return res.status(400).json({ error: "No listId parameter provided." });
	}
	const listId = +req.params.listId;
	if (Number.isNaN(listId)) {
		return res.status(400).json({
			error: `Invalid listId provided (must be a number): ${req.params.listId}`,
		});
	}

	const cacheKey = `api:items:${listId}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		return res.status(200).json(JSON.parse(cache));
	}

	const list = await prisma.list.findUnique({ where: { id: listId } });
	if (!list) {
		return res
			.status(404)
			.json({ error: `No list found with id ${listId}` });
	}

	const offset: number = +(req.query.offset ?? 0);
	let items = await prisma.item.findMany({
		where: {
			listId: listId,
			deleted: false,
		},
		orderBy: { postDate: "desc" },
		skip: offset,
		take: MAX_RESULTS + 1, // Just to see if there is any point to getting a next page
	});

	const hasMore = items.length > MAX_RESULTS;
	if (hasMore) {
		items = items.slice(0, MAX_RESULTS);
	}
	await redisClient.set(cacheKey, JSON.stringify(items));
	await redisClient.expire(cacheKey, 30);

	res.status(200).json(items);
});

export default router;
