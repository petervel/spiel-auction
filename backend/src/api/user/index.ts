import { Day } from "@prisma/client";
import express from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import { fetchWishlist } from "../../bggCollection";
import {
	checkThreadForHash,
	generateVerificationHash,
} from "../../bggVerification";
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
// there), a description-only save (keeping the current square), and
// deselecting a square (clicking it again sends square: null, keeping the
// description in case the same square gets picked again later).
router.post(
	"/location",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { square, description } = req.body;

			if (
				square !== null &&
				(typeof square !== "string" ||
					!VALID_LOCATION_SQUARE.test(square))
			) {
				res.status(400).json({
					error: "square must be one of A1-E8, or null to clear it",
				});
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

			// A meetup spot is a claim about being a specific real person at
			// the fair - only let someone make it once they've proven they
			// control the BGG account they're claiming.
			if (!req.user?.bggUsername) {
				res.status(403).json({
					error: "Verify your BGG username in Settings before setting a meetup location.",
				});
				return;
			}

			const verification = await prisma.bggVerification.findUnique({
				where: {
					userId_bggUsername: {
						userId: req.user.id,
						bggUsername: req.user.bggUsername,
					},
				},
			});

			if (!verification?.confirmed) {
				res.status(403).json({
					error: "Verify your BGG username in Settings before setting a meetup location.",
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

// Fuzzy username search for the meetup-location lookup (Meetup Info page) -
// same shape as /admin/users/search, but open to any authenticated user
// rather than admin-gated, and scoped down accordingly: only bggUsername
// and this fair's meetup spot, never accessLevel/createdAt/id. Only
// matches people who've actually set a spot for the caller's current
// fair - there's nothing useful to show otherwise, and it keeps this from
// doubling as a general "does this username exist" probe.
router.get(
	"/location/search",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const query =
				typeof req.query.bggUsername === "string"
					? req.query.bggUsername.trim()
					: "";
			if (query.length < 2) {
				res.status(400).json({
					error: "Search for at least 2 characters.",
				});
				return;
			}

			const fairId = req.user?.currentUserFair?.fairId;
			if (!fairId) {
				res.status(400).json({
					error: "No current fair selected for user.",
				});
				return;
			}

			const rows = await prisma.userFair.findMany({
				where: {
					fairId,
					locationSquare: { not: null },
					user: { bggUsername: { contains: query } },
				},
				include: { user: { select: { bggUsername: true } } },
				take: 20,
			});

			const results = rows
				.filter((row) => row.user.bggUsername)
				.map((row) => ({
					bggUsername: row.user.bggUsername as string,
					square: row.locationSquare,
					description: row.locationDescription,
				}))
				.sort((a, b) => a.bggUsername.localeCompare(b.bggUsername));

			res.status(200).json({ results });
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
			let { bggUsername } = req.body;

			if (typeof bggUsername !== "string" && bggUsername !== null) {
				return res.status(400).json({
					error: "bggUsername must be a string or null",
				});
			}

			// A copy-pasted username (e.g. from a BGG profile URL, or a
			// "@username"-style mention) can carry invisible leading/trailing
			// whitespace or a leading "@" that was never part of the real BGG
			// username - utf8mb4_unicode_ci is a PAD SPACE collation, so MySQL
			// treats "foo " and "foo" as the same value for lookups/
			// uniqueness, but a strict JS === (e.g. in checkThreadForHash,
			// matching this against BGG's own clean username) does not.
			// Trimming to zero-width is empty too, so that collapses to
			// "removed" the same as submitting "".
			if (typeof bggUsername === "string") {
				bggUsername =
					bggUsername.trim().replace(/^@/, "").trim() || null;
			}

			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}

			const updatedUser = await prisma.user.update({
				where: { id: req.user.id },
				data: { bggUsername },
			});

			// Verification records are kept per (user, bggUsername) pair, not
			// deleted on change - switching away from a verified username and
			// back later should still show it as verified, not force a redo.

			res.status(200).json({ user: updatedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/bggUsername/verify",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}
			if (!req.user.bggUsername) {
				return res.status(400).json({ error: "No bggUsername set" });
			}

			const hash = generateVerificationHash();
			const verification = await prisma.bggVerification.upsert({
				where: {
					userId_bggUsername: {
						userId: req.user.id,
						bggUsername: req.user.bggUsername,
					},
				},
				create: {
					userId: req.user.id,
					bggUsername: req.user.bggUsername,
					hash,
					confirmed: false,
				},
				update: {
					hash,
					confirmed: false,
					confirmedAt: null,
				},
			});

			res.status(200).json({
				bggUsername: verification.bggUsername,
				hash: verification.hash,
				confirmed: verification.confirmed,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.get(
	"/bggUsername/verify",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}
			if (!req.user.bggUsername) {
				return res.status(200).json({ exists: false });
			}

			const verification = await prisma.bggVerification.findUnique({
				where: {
					userId_bggUsername: {
						userId: req.user.id,
						bggUsername: req.user.bggUsername,
					},
				},
			});

			if (!verification) {
				return res.status(200).json({ exists: false });
			}

			res.status(200).json({
				exists: true,
				bggUsername: verification.bggUsername,
				hash: verification.hash,
				confirmed: verification.confirmed,
				confirmedAt: verification.confirmedAt,
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

router.post(
	"/bggUsername/verify/check",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}
			if (!req.user.bggUsername) {
				return res
					.status(400)
					.json({ error: "No verification in progress" });
			}

			const verificationKey = {
				userId: req.user.id,
				bggUsername: req.user.bggUsername,
			};

			const verification = await prisma.bggVerification.findUnique({
				where: { userId_bggUsername: verificationKey },
			});
			if (!verification) {
				return res
					.status(400)
					.json({ error: "No verification in progress" });
			}

			let found: boolean;
			try {
				found = await checkThreadForHash(
					verification.bggUsername,
					verification.hash,
				);
			} catch (err) {
				console.error(err);
				return res.status(502).json({
					error: "Couldn't reach BGG to check - try again in a moment",
				});
			}

			if (found) {
				await prisma.bggVerification.update({
					where: { userId_bggUsername: verificationKey },
					data: { confirmed: true, confirmedAt: new Date() },
				});
			}

			res.status(200).json({ confirmed: found });
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
				notifyOnMeetupReminder,
			} = req.body;

			if (
				typeof notifyOnOutbid !== "boolean" ||
				typeof notifyOnNewBid !== "boolean" ||
				typeof notifyOnAuctionWon !== "boolean" ||
				typeof notifyOnWishlistItemListed !== "boolean" ||
				typeof notifyOnMeetupReminder !== "boolean"
			) {
				return res.status(400).json({
					error: "notifyOnOutbid, notifyOnNewBid, notifyOnAuctionWon, notifyOnWishlistItemListed, and notifyOnMeetupReminder must all be booleans",
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
					notifyOnMeetupReminder,
				},
			});

			res.status(200).json({ user: updatedUser });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

const VALID_TRADE_DAYS = new Set(Object.values(Day));

router.post(
	"/geekmailSettings",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { preferredTradeDays, sellerMessageTemplate, buyerMessageTemplate } =
				req.body;

			if (
				!Array.isArray(preferredTradeDays) ||
				!preferredTradeDays.every((day) => VALID_TRADE_DAYS.has(day))
			) {
				return res.status(400).json({
					error: `preferredTradeDays must be an array of ${[...VALID_TRADE_DAYS].join(", ")}`,
				});
			}
			if (
				sellerMessageTemplate !== null &&
				typeof sellerMessageTemplate !== "string"
			) {
				return res.status(400).json({
					error: "sellerMessageTemplate must be a string or null",
				});
			}
			if (
				buyerMessageTemplate !== null &&
				typeof buyerMessageTemplate !== "string"
			) {
				return res.status(400).json({
					error: "buyerMessageTemplate must be a string or null",
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({ error: "Not authenticated" });
			}

			const updatedUser = await prisma.user.update({
				where: { id: req.user.id },
				data: {
					preferredTradeDays,
					sellerMessageTemplate,
					buyerMessageTemplate,
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
