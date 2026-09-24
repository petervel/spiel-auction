import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import { fetchWishlist } from "../../bggCollection";
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

const VALID_LOCATION_SQUARE = /^[A-E][1-8]$/;

// Square + description are always sent together - the map page uses this
// both for clicking a square (keeping whatever description is already
// there) and for a description-only save (keeping the current square).
router.post(
	"/location",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { square, description } = req.body;

			if (
				typeof square !== "string" ||
				!VALID_LOCATION_SQUARE.test(square)
			) {
				res.status(400).json({ error: "square must be one of A1-E8" });
				return;
			}

			if (
				description !== undefined &&
				description !== null &&
				typeof description !== "string"
			) {
				res.status(400).json({
					error: "description must be a string or null",
				});
				return;
			}

			if (!req.user?.currentUserFairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			await prisma.userFair.update({
				where: { id: req.user.currentUserFairId },
				data: {
					locationSquare: square,
					locationDescription: description ?? null,
				},
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.delete(
	"/location",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.user?.currentUserFairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			await prisma.userFair.update({
				where: { id: req.user.currentUserFairId },
				data: { locationSquare: null, locationDescription: null },
			});

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

// Heatmap data: how many users on the caller's own current fair picked each
// square (including the caller) - so people can find a quieter spot.
router.get(
	"/location/counts",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const fairId = req.user?.currentUserFair?.fairId;
			if (!fairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			const rows = await prisma.userFair.groupBy({
				by: ["locationSquare"],
				where: { fairId, locationSquare: { not: null } },
				_count: { locationSquare: true },
			});

			const counts = Object.fromEntries(
				rows.map((row) => [
					row.locationSquare,
					row._count.locationSquare,
				]),
			);

			res.status(200).json({ counts });
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

router.post(
	"/notificationPreferences",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const {
				notifyOnOutbid,
				notifyOnNewBid,
				notifyOnAuctionWon,
				notifyOnWishlistItemListed,
			} = req.body;

			if (
				typeof notifyOnOutbid !== "boolean" ||
				typeof notifyOnNewBid !== "boolean" ||
				typeof notifyOnAuctionWon !== "boolean" ||
				typeof notifyOnWishlistItemListed !== "boolean"
			) {
				return res.status(400).json({
					error: "notifyOnOutbid, notifyOnNewBid, notifyOnAuctionWon, and notifyOnWishlistItemListed must all be booleans",
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}

			const updatedUser = await prisma.user.update({
				where: { id: req.user.id },
				data: {
					notifyOnOutbid,
					notifyOnNewBid,
					notifyOnAuctionWon,
					notifyOnWishlistItemListed,
				},
			});

			res.status(200).json({ user: updatedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/currentFair",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const fairId = +req.body.fairId;
			if (Number.isNaN(fairId)) {
				res.status(400).json({ error: "Invalid fairId" });
				return;
			}

			const fair = await prisma.fair.findUnique({
				where: { id: fairId },
			});
			if (!fair) {
				res.status(404).json({ error: "Fair not found" });
				return;
			}

			const isAdmin = req.user?.accessLevel === "ADMIN";

			// Normal users can switch to any non-hidden fair. Admins can
			// switch to any fair, including hidden ones.
			if (!isAdmin && fair.hidden) {
				res.status(403).json({ error: "Forbidden" });
				return;
			}

			if (!req.user?.id) {
				res.status(401).json({ error: "Not authenticated" });
				return;
			}

			const userFair =
				(await prisma.userFair.findUnique({
					where: {
						userId_fairId: { userId: req.user.id, fairId },
					},
				})) ??
				(await prisma.userFair.create({
					data: { userId: req.user.id, fairId },
				}));

			const updatedUser = await prisma.user.update({
				where: { id: req.user.id },
				data: { currentUserFairId: userFair.id },
				include: { currentUserFair: { include: { fair: true } } },
			});

			res.status(200).json({ user: updatedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.get(
	"/bggWishlist",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		const username = req.user?.bggUsername;
		if (!username) {
			res.status(400).json({ error: "No BGG username set" });
			return;
		}

		try {
			const items = await fetchWishlist(username);
			res.status(200).json({ items });
		} catch (err) {
			console.error("Failed to fetch BGG wishlist:", err);
			const message =
				err instanceof Error ? err.message : "Unknown error";
			res.status(502).json({ error: message });
		}
	},
);

export default router;
