import express from "express";
import prisma from "../../prismaClient";

const router = express.Router();

router.get("/", async (_, res) => {
	const fairs = await prisma.fair.findMany();
	res.status(200).json(fairs);
});

export default router;
