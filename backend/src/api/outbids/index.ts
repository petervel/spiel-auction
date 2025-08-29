import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

router.get("/", (_, res) => {
	res.status(400).json({ error: "No listId parameter provided." });
});

router.get("/:listId", async (req, res) => {
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

	const cacheKey = `api:outbid:${listId}:${bidder}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	const list = await prisma.list.findUnique({ where: { id: listId } });
	if (!list) {
		res.status(404).json({ error: `No list found with id ${listId}` });
		return;
	}
	console.log({ listId, bidder });

	const items = await prisma.item.findMany({
		where: {
			listId: listId,
			deleted: false,
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

	// console.log("found outbids:", { items });

	const result = items.filter(
		(item) => item.highestBidder?.toLowerCase() != bidder.toLowerCase(),
	);

	console.log("filtered:", { result });

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

export default router;
