import express from "express";
import prisma from "../../prismaClient";
// import { checkAdmin } from "../../util";

import { redisClient } from "../redisClient";

const router = express.Router();

router.get(
	"/",
	/*checkAdmin,*/ async (_, res) => {
		const cacheKey = "api:fairs";
		const cache = await redisClient.get(cacheKey);
		if (cache) {
			return res.status(200).json(JSON.parse(cache));
		}
		const fairs = await prisma.fair.findMany();
		await redisClient.set(cacheKey, JSON.stringify(fairs));
		await redisClient.expire(cacheKey, 30);
		res.status(200).json(fairs);
	},
);

export default router;
