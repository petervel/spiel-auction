import { Item } from "@prisma/client";
import express from "express";
import prisma from "../../prismaClient";
import { useListId } from "../useListId";
// import { checkAdmin } from "../../util";

const router = express.Router();
const LIST_ID = useListId();

type UserDupes = Record<
	string,
	{
		username: string;
		maxId: number;
		dupes: [
			{
				objectName: string;
				items: Item[];
			},
		];
	}
>;

router.get("/", (_, res) => {
	res.status(400).json({ error: "No listId parameter provided." });
});

router.get("/:listId", async (req, res) => {
	const listId = +(req.params.listId ?? LIST_ID);
	if (!listId) {
		res.status(400).json({ error: "No listId parameter provided." });
		return;
	}
	if (Number.isNaN(listId)) {
		res.status(400).json({
			error: `Invalid listId provided (must be a number): ${req.params.listId}`,
		});
		return;
	}

	const duplicates = await prisma.item.groupBy({
		by: ["listId", "username", "objectId", "objectName"],
		where: {
			listId,
			deleted: false,
			NOT: {
				objectId: 23953, // Outside scope of BGG
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

	let result: UserDupes = {};
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

		if (!result[duplicate.username]) {
			result[duplicate.username] = {
				username: duplicate.username,
				maxId,
				dupes: [{ objectName: duplicate.objectName, items: items }],
			};
		} else {
			const current = result[duplicate.username];
			const newDupes = current.dupes;
			newDupes.push({ objectName: duplicate.objectName, items: items });
			result[duplicate.username] = {
				...current,
				maxId: Math.max(current.maxId, maxId),
				dupes: newDupes,
			};
		}
	}

	res.status(200).json(
		Object.values(result)
			.sort((userDupe) => userDupe.maxId)
			.reverse(),
	);
});

export default router;
