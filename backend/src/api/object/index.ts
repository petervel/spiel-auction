import express from "express";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const MAX_RESULTS = 100;
const LIST_ID = 339779;

const router = express.Router();
type BggObject = {
	objectId: number;
	objectName: string;
	objectSubtype: string;
};
router.get("/", async (req, res) => {
	const search = (req.query.search as string) || undefined;

	const cacheKey = `api:objects:${search}`;

	const cache = await redisClient.get(cacheKey);
	if (cache) {
		return res.status(200).json(JSON.parse(cache));
	}

	let objects = await prisma.$queryRaw<BggObject[]>`
		SELECT MAX(id) AS \`maxId\`, \`objectId\`, \`objectName\`, \`objectSubtype\` FROM \`Item\`
		WHERE \`listId\` = ${LIST_ID}
			AND \`deleted\` = false
			AND LOWER(\`objectName\`) LIKE CONCAT('%', LOWER(${search}), '%')
		GROUP BY \`objectId\`, \`objectName\`, \`objectSubtype\`
		ORDER BY
			CASE
				-- Exact match at the start of the string
				WHEN LOWER(\`objectName\`) LIKE CONCAT(LOWER(${search}), '%') THEN 0
				-- Match with space before the search term (anywhere within the string)
				WHEN LOWER(\`objectName\`) LIKE CONCAT('% ', LOWER(${search}), '%') THEN 1
				-- Substring found, but not at the beginning or after space
				ELSE POSITION(LOWER(${search}) IN LOWER(\`objectName\`)) + 1
			END ASC,
			\`maxId\` DESC -- newest products first?
		LIMIT ${MAX_RESULTS}`;

	await redisClient.set(cacheKey, JSON.stringify(objects));
	await redisClient.expire(cacheKey, 300);

	res.status(200).json(objects);
});

router.get("/:objectId", async (req, res) => {
	if (!req.params.objectId) {
		return res
			.status(400)
			.json({ error: "No objectId parameter provided." });
	}
	const objectId = +req.params.objectId;
	if (Number.isNaN(objectId)) {
		return res.status(400).json({
			error: `Invalid objectId provided (must be a number): ${req.params.objectId}`,
		});
	}
	const cacheKey = `api:object:${objectId}`;
	const cache = await redisClient.get(cacheKey);
	if (cache) {
		return res.status(200).json(JSON.parse(cache));
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
