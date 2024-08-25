import express from "express";
import prisma from "../../prismaClient";
// import { checkAdmin } from "../../util";

const router = express.Router();

router.get(
	"/",
	/*checkAdmin,*/ async (_, res) => {
		const fairs = await prisma.fair.findMany();
		res.status(200).json(fairs);
	},
);

export default router;
