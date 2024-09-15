import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

router.get("/", (_, res) => {
	return res.status(400).json({ error: "No listId parameter provided." });
});

router.get("/:listId", async (req, res) => {
	const listId = +req.params.listId;
	if (Number.isNaN(listId)) {
		return res.status(400).json({
			error: `Invalid listId provided (must be a number): ${req.params.listId}`,
		});
	}
	if (!req.query.bidder) {
		return res.status(400).json({ error: "No listId bidder provided." });
	}

	const bidder = req.query.bidder as string;

	const cacheKey = `api:outbid:${listId}:${bidder}`;
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

	const items = await prisma.item.findMany({
		where: {
			listId: listId,
			deleted: false,
			isEnded: false,
			isSold: false,
			comments: {
				some: {
					oldBid: {
						not: null,
					},
					username: bidder,
					deleted: false,
				},
			},
		},
		include: {
			comments: true,
		},
	});

	const result = items.filter((item) => {
		return item.highestBidder?.toLowerCase() != bidder.toLowerCase();
	});

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

export default router;
