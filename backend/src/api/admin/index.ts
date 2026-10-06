import express from "express";
import prisma from "../../prismaClient";
import {
	AuthenticatedRequest,
	authenticateUser,
	EMULATED_USER_COOKIE,
	requireAdmin,
} from "../../../middleware/auth";

const router = express.Router();

const EMULATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

router.get(
	"/users/search",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const query =
				typeof req.query.bggUsername === "string"
					? req.query.bggUsername.trim()
					: "";
			if (query.length < 2) {
				return res
					.status(400)
					.json({ error: "Search for at least 2 characters." });
			}

			const users = await prisma.user.findMany({
				where: { bggUsername: { contains: query } },
				select: {
					id: true,
					bggUsername: true,
					createdAt: true,
					accessLevel: true,
					bggVerifications: {
						where: { confirmed: true },
						select: { bggUsername: true },
					},
				},
				orderBy: { bggUsername: "asc" },
				take: 20,
			});

			return res.json({
				users: users.map(({ bggVerifications, ...user }) => ({
					...user,
					verified: bggVerifications.some(
						(v) => v.bggUsername === user.bggUsername,
					),
				})),
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/emulate",
	authenticateUser,
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		const userId = Number(req.body?.userId);
		if (!Number.isInteger(userId)) {
			return res.status(400).json({ error: "userId is required" });
		}
		if (userId === req.realUser?.id) {
			return res
				.status(400)
				.json({ error: "You can't emulate yourself." });
		}

		const target = await prisma.user.findUnique({ where: { id: userId } });
		if (!target) {
			return res.status(404).json({ error: "User not found" });
		}

		res.cookie(EMULATED_USER_COOKIE, String(userId), {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: EMULATION_MAX_AGE_MS,
		});
		return res.json({ emulating: true, userId });
	},
);

router.delete(
	"/emulate",
	authenticateUser,
	requireAdmin,
	(_req: AuthenticatedRequest, res) => {
		res.clearCookie(EMULATED_USER_COOKIE, { path: "/" });
		return res.json({ emulating: false });
	},
);

export default router;
