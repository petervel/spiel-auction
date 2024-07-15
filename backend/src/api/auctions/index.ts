import express from "express";
import prisma from "../../prismaClient";

const router = express.Router();

router.get("/", async (_, res) => {
	const items = await prisma.item.findMany();
	res.json({ response: items, status: 200 });
});

export default router;
