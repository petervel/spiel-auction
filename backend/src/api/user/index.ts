import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";

const router = express.Router();

router.post(
	"/bookmark",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.body.bookmark) {
				res.status(400).json({
					error: "No bookmark parameter provided.",
				});
				return;
			}

			const bookmark = +req.body.bookmark;
			if (Number.isNaN(bookmark)) {
				res.status(400).json({
					error: `Invalid bookmark provided (must be a number): ${req.body.bookmark}`,
				});
				return;
			}

			// 🔹 middleware guarantees req.user is populated
			if (!req.user?.currentUserFairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			await prisma.userFair.update({
				where: { id: req.user.currentUserFairId },
				data: { bookmark },
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.delete(
	"/bookmark",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			// 🔹 middleware guarantees req.user is populated
			if (!req.user?.currentUserFairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			await prisma.userFair.update({
				where: { id: req.user.currentUserFairId },
				data: { bookmark: null },
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/bggUsername",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { bggUsername } = req.body;

			if (typeof bggUsername !== "string" && bggUsername !== null) {
				return res.status(400).json({
					error: "bggUsername must be a string or null",
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}

			const updatedUser = await prisma.user.update({
				where: { id: req.user.id },
				data: { bggUsername },
			});

			res.status(200).json({ user: updatedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
