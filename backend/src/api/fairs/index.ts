import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";
import { redisClient } from "../redisClient";

const router = express.Router();

router.get(
	"/",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const isAdmin = req.user?.accessLevel === "ADMIN";
		// Keyed per access level - a flat cache key would leak the test fair
		// to a normal user (or hide it from an admin) depending on who
		// happens to populate the cache first.
		const cacheKey = `api:fairs:${isAdmin ? "admin" : "normal"}`;

		const cache = await redisClient.get(cacheKey);
		if (cache) {
			res.status(200).json(JSON.parse(cache));
			return;
		}
		// Admins can see/select any fair, including hidden ones; normal
		// users only get non-hidden ones.
		const fairs = await prisma.fair.findMany({
			where: isAdmin ? {} : { hidden: false },
		});
		await redisClient.set(cacheKey, JSON.stringify(fairs));
		await redisClient.expire(cacheKey, 30);
		res.status(200).json(fairs);
	},
);

export default router;
