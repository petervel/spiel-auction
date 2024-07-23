import express from "express";
import prisma from "../../prismaClient";

const router = express.Router();

router.get("/", async (_, res) => {
	console.log("Fairs requested.");
	const fairs = await prisma.fair.findMany();
	console.log("Returning fairs: ", fairs);
	res.json({ response: fairs, status: 200 });
});

export default router;
``;
