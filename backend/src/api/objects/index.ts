import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const MAX_RESULTS = 100;

const router = express.Router();
type BggObject = {
	objectId: number;
	objectName: string;
	objectSubtype: string;
};
router.get("/:listId", async (req, res) => {
	const LIST_ID = +req.params.listId;
	if (Number.isNaN(LIST_ID)) {
		res.status(400).json({
			error: `Invalid listId provided (must be a number): ${req.params.listId}`,
		});
		return;
	}

	const search = (req.query.search as string) || undefined;

	const offset = +(req.query.offset ?? 0) as number;

	const cacheKey = `api:objects:${LIST_ID}:${search}:${offset}`;

	const cache = await redisClient.get(cacheKey);
	if (cache) {
		res.status(200).json(JSON.parse(cache));
		return;
	}

	let objects = await prisma.$queryRaw<BggObject[]>`
		SELECT MAX(id) AS \`maxId\`, \`objectId\`, \`objectName\`, \`objectSubtype\` FROM \`Item\`
		WHERE \`listId\` = ${LIST_ID}
			AND \`deleted\` = false
			AND LOWER(\`objectName\`) LIKE CONCAT('%', LOWER(${search}), '%')
		GROUP BY \`objectId\`, \`objectName\`, \`objectSubtype\`
		ORDER BY
			CASE
				-- Perfect match
				WHEN LOWER(\`objectName\`) = LOWER(${search}) THEN 0
				-- Exact match at the start of the string
				WHEN LOWER(\`objectName\`) LIKE CONCAT(LOWER(${search}), '%') THEN 1
				-- Match with space before the search term (anywhere within the string)
				WHEN LOWER(\`objectName\`) LIKE CONCAT('% ', LOWER(${search}), '%') THEN 2
				-- Substring found, but not at the beginning or after space
				ELSE POSITION(LOWER(${search}) IN LOWER(\`objectName\`)) + 10
			END ASC,
			CASE
				WHEN LOWER(\`objectName\`) LIKE CONCAT('% ', LOWER(${search}), '%')
				THEN POSITION(CONCAT(' ', LOWER(${search})) IN LOWER(\`objectName\`))
				ELSE NULL
			END ASC,
			\`objectName\` ASC -- newest products first?
		LIMIT ${MAX_RESULTS + 1} OFFSET ${offset}`;

	const hasMore = objects.length > MAX_RESULTS;
	if (hasMore) {
		objects = objects.slice(0, MAX_RESULTS);
	}

	const result = {
		objects,
		hasMore,
		lastIndex: offset + objects.length,
	};

	await redisClient.set(cacheKey, JSON.stringify(result));
	await redisClient.expire(cacheKey, 300);

	res.status(200).json(result);
});

export default router;
