import express from "express";
import prisma from "../../prismaClient";

const router = express.Router();

const MAX_RESULTS = 3;

router.get("/:listId", async (req, res) => {
	if (!req.params.listId) {
		return error(res, 400, "No listId parameter provided.");
	}
	const listId = +req.params.listId;
	if (Number.isNaN(listId)) {
		return error(
			res,
			400,
			`Invalid listId provided (must be a number): ${req.params.listId}`,
		);
	}

	const list = await prisma.list.findUnique({ where: { id: listId } });
	if (!list) {
		return error(res, 404, `No list found with id ${listId}`);
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
	res.status(200).json(items);
});

const error = (res: express.Response, status: number, text: string) =>
	res.status(status).json({ error: text });

export default router;
