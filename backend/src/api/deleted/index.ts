import express from "express";
import prisma from "../../prismaClient";

const router = express.Router();

router.get("/", async (_, res) => {
	const deletes = await prisma.item.findMany({
		where: {
			deleted: true,
		},
	});

	res.status(200).json(deletes);
});

export default router;
