import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

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

	let lastId: number | null = null;
	if (req.query.lastId) {
		lastId = +req.query.lastId;
		if (Number.isNaN(lastId)) {
			return res.status(400).json({
				error: `Invalid lastId provided (must be a number): ${req.params.listId}`,
			});
		}
	}

	let otherFiltersKey = "";
	const otherFilters: Record<string, any> = {};
	if (req.query.buyer) {
		otherFilters.highestBidder = req.query.buyer;
		otherFiltersKey += `&highestBidder=${otherFilters.highestBidder}`;
	} else if (req.query.seller) {
		otherFilters.username = req.query.seller;
		otherFiltersKey += `&username=${otherFilters.username}`;
	}

	const cacheKey = `api:bids:${listId}${otherFiltersKey}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		// console.log(`got ${cacheKey} from cache`);
		return res.status(200).json(JSON.parse(cache));
	}
	// console.log(`fetching ${cacheKey} from db`);

	const list = await prisma.list.findUnique({ where: { id: listId } });
	if (!list) {
		return res
			.status(404)
			.json({ error: `No list found with id ${listId}` });
	}

	// console.log({
	// 	listId: listId,
	// 	deleted: false,
	// 	...otherFilters,
	// });

	let items = await prisma.item.findMany({
		where: {
			listId: listId,
			deleted: false,
			...otherFilters,
		},
		orderBy: { id: "desc" },
	});

	// console.log(`got ${items.length} of ${MAX_RESULTS} items`);

	const sumResult = await prisma.item.aggregate({
		_sum: {
			currentBid: true,
		},
		where: {
			listId: listId,
			deleted: false,
			hasBids: true,
			...otherFilters,
		},
	});

	const totalPrice = sumResult._sum.currentBid || 0;

	const result = {
		items,
		totalPrice,
		lastId: items[items.length - 1]?.id,
	};

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 60);

	res.status(200).json(result);
});

export default router;
