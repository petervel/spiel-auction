import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

const MAX_RESULTS: number = +(process.env.PAGE_SIZE ?? 3);

router.get("/", (_, res) => {
	res.status(400).json({ error: "No listId parameter provided." });
});

router.get("/:listId", async (req, res) => {
	if (!req.params.listId) {
		res.status(400).json({ error: "No listId parameter provided." });
		return;
	}
	const listId = +req.params.listId;
	if (Number.isNaN(listId)) {
		res.status(400).json({
			error: `Invalid listId provided (must be a number): ${req.params.listId}`,
		});
		return;
	}

	let lastId: number | null = null;
	if (req.query.lastId) {
		lastId = +req.query.lastId;
		if (Number.isNaN(lastId)) {
			res.status(400).json({
				error: `Invalid lastId provided (must be a number): ${req.query.lastId}`,
			});
			return;
		}
	}

	let otherFiltersKey = "";
	const otherFilters: Record<string, any> = {};
	if (req.query.buyer) {
		otherFilters.highestBidder = req.query.buyer;
		otherFiltersKey += `&highestBidder=${otherFilters.highestBidder}`;
	}
	if (req.query.seller) {
		otherFilters.username = req.query.seller;
		otherFiltersKey += `&username=${otherFilters.username}`;
	}

	if (req.query.search) {
		otherFilters.objectName = {
			contains: req.query.search,
		};
		otherFiltersKey += `&search=${req.query.search}`;
	}

	const lastIdKey = lastId ? "<" + lastId : "";

	const cacheKey = `api:items:${listId}${lastIdKey}${otherFiltersKey}`;

	const cache = await redisClient.get(cacheKey);
	if (cache) {
		// console.log(`got ${cacheKey} from cache`);
		res.status(200).json(JSON.parse(cache));
		return;
	}
	// console.log(`fetching ${cacheKey} from db`);

	const list = await prisma.list.findUnique({ where: { id: listId } });
	if (!list) {
		res.status(404).json({ error: `No list found with id ${listId}` });
		return;
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
		cursor: lastId ? { id: lastId } : undefined,
		skip: lastId ? 1 : 0,
		take: MAX_RESULTS + 1, // Just to see if there is any point to getting a next page
	});

	// console.log(`got ${items.length} of ${MAX_RESULTS} items`);
	const hasMore = items.length > MAX_RESULTS;
	if (hasMore) {
		items = items.slice(0, MAX_RESULTS);
	}

	const result = {
		items,
		hasMore,
		lastId: items[items.length - 1]?.id,
	};

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 30);

	res.status(200).json(result);
});

export default router;
