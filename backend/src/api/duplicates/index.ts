import { Item } from "@prisma/client";
import express from "express";
import prisma from "../../prismaClient";
// import { checkAdmin } from "../../util";

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

	const duplicates = await prisma.item.groupBy({
		by: ["listId", "username", "objectId"],
		where: {
			listId,
			deleted: false,
			NOT: {
				objectId: 23953,
			},
		},
		_count: {
			id: true,
		},
		having: {
			id: {
				_count: {
					gte: 2,
				},
			},
		},
	});

	const dict: Record<string, Item[]> = {};
	for (const duplicate of duplicates) {
		const items = await prisma.item.findMany({
			where: {
				listId: duplicate.listId,
				username: duplicate.username,
				objectId: duplicate.objectId,
				deleted: false,
			},
		});

		const maxId = Math.max(...items.map((item) => item.id));

		dict[maxId] = items;
	}

	const sortedKeys = Object.keys(dict).sort().reverse();
	let result: Item[] = [];
	for (const key of sortedKeys) {
		result = result.concat(dict[key]);
	}

	res.status(200).json(result);
});

export default router;