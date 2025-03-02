import express from "express";
import prisma from "../../prismaClient";
import { useListId } from "../useListId";
const router = express.Router();
const LIST_ID = useListId();

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
	const deletedItems = await prisma.item.findMany({
		where: { listId, deleted: true },
		orderBy: { username: "asc" },
	});

	const deletedItemComments = await prisma.itemComment.findMany({
		where: { listId, deleted: true, item: { deleted: false } },
		orderBy: { username: "asc" },
	});

	res.status(200).json({
		items: deletedItems,
		itemComments: deletedItemComments,
	});
});

export default router;
