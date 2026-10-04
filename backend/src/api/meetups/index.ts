import { Day } from "@prisma/client";
import express, { Response } from "express";
import {
	AuthenticatedRequest,
	authenticateUser,
} from "../../../middleware/auth";
import prisma from "../../prismaClient";

const router = express.Router();

type VerifiedContext = {
	myUsername: string;
	fairId: number;
	listId: number;
};

// A meetup, like a meetup location (see POST /user/location), is a claim
// about being a specific real person at the fair - same proof-of-ownership
// bar (confirmed BggVerification, not just a claimed bggUsername) for both
// viewing and editing, since the counterpart's location is only shown once
// that's established. Sends the matching 403/400 and returns null itself
// so callers can just `if (!context) return;`.
const requireVerifiedContext = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<VerifiedContext | null> => {
	if (!req.user?.bggUsername) {
		res.status(403).json({
			error: "Verify your BGG username in Settings before using meetups.",
		});
		return null;
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
			error: "Verify your BGG username in Settings before using meetups.",
		});
		return null;
	}

	const fairId = req.user.currentUserFair?.fairId;
	const listId = req.user.currentUserFair?.fair?.listId;
	if (!fairId || !listId) {
		res.status(400).json({ error: "No current fair selected for user." });
		return null;
	}

	return { myUsername: req.user.bggUsername, fairId, listId };
};

type Role = "buying" | "selling";

// GET /api/meetups - every counterpart the caller currently has a live
// buying or selling relationship with in their current fair (won/winning,
// or sold/selling with at least one bid), each with whatever Meetup
// details exist - schema defaults ("Hall 1A", "15:00", day: null) for a
// pair that's never been edited, not yet written to the DB.
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
	try {
		const context = await requireVerifiedContext(req, res);
		if (!context) return;
		const { myUsername, fairId, listId } = context;

		const [buyingItems, sellingItems] = await Promise.all([
			prisma.item.findMany({
				where: {
					listId,
					deleted: false,
					hasBids: true,
					highestBidder: myUsername,
				},
			}),
			prisma.item.findMany({
				where: { listId, deleted: false, hasBids: true, username: myUsername },
			}),
		]);

		type ItemRow = (typeof buyingItems)[number];
		type Entry = { role: Role; counterpart: string; items: ItemRow[] };

		const entriesByKey = new Map<string, Entry>();
		for (const item of buyingItems) {
			const key = `buying:${item.username.toLowerCase()}`;
			const existing = entriesByKey.get(key);
			if (existing) existing.items.push(item);
			else
				entriesByKey.set(key, {
					role: "buying",
					counterpart: item.username,
					items: [item],
				});
		}
		for (const item of sellingItems) {
			if (!item.highestBidder) continue;
			const key = `selling:${item.highestBidder.toLowerCase()}`;
			const existing = entriesByKey.get(key);
			if (existing) existing.items.push(item);
			else
				entriesByKey.set(key, {
					role: "selling",
					counterpart: item.highestBidder,
					items: [item],
				});
		}

		const entries = [...entriesByKey.values()];
		const counterpartUsernames = [
			...new Set(entries.map((entry) => entry.counterpart)),
		];

		const [meetups, locationRows] = await Promise.all([
			counterpartUsernames.length === 0
				? Promise.resolve([])
				: prisma.meetup.findMany({
						where: {
							fairId,
							OR: [
								{
									buyerUsername: myUsername,
									sellerUsername: { in: counterpartUsernames },
								},
								{
									sellerUsername: myUsername,
									buyerUsername: { in: counterpartUsernames },
								},
							],
						},
					}),
			counterpartUsernames.length === 0
				? Promise.resolve([])
				: prisma.userFair.findMany({
						where: {
							fairId,
							locationSquare: { not: null },
							user: { bggUsername: { in: counterpartUsernames } },
						},
						include: { user: { select: { bggUsername: true } } },
					}),
		]);

		// Keyed by the exact (buyer, seller) pair, not just the counterpart -
		// the same username can legitimately appear as both my buyer and my
		// seller (two separate rows, see the Meetup model comment).
		const meetupByPairKey = new Map<string, (typeof meetups)[number]>();
		for (const meetup of meetups) {
			meetupByPairKey.set(
				`${meetup.buyerUsername.toLowerCase()}|${meetup.sellerUsername.toLowerCase()}`,
				meetup,
			);
		}

		const locationByUsername: Record<
			string,
			{ square: string | null; description: string | null }
		> = {};
		for (const row of locationRows) {
			const key = row.user.bggUsername?.toLowerCase();
			// First match wins if multiple accounts share a username.
			if (!key || locationByUsername[key]) continue;
			locationByUsername[key] = {
				square: row.locationSquare,
				description: row.locationDescription,
			};
		}

		const result = entries.map((entry) => {
			const buyerUsername =
				entry.role === "buying" ? myUsername : entry.counterpart;
			const sellerUsername =
				entry.role === "buying" ? entry.counterpart : myUsername;
			const meetup = meetupByPairKey.get(
				`${buyerUsername.toLowerCase()}|${sellerUsername.toLowerCase()}`,
			);
			const totalPrice = entry.items.reduce(
				(sum, item) => sum + (item.currentBid ?? 0),
				0,
			);

			return {
				role: entry.role,
				counterpart: entry.counterpart,
				counterpartLocation:
					locationByUsername[entry.counterpart.toLowerCase()] ?? null,
				items: entry.items,
				totalPrice,
				meetup: {
					day: meetup?.day ?? null,
					location: meetup?.location ?? "Hall 1A",
					time: meetup?.time ?? "15:00",
					completed: meetup?.completed ?? false,
					completedAt: meetup?.completedAt ?? null,
					updatedAt: meetup?.updatedAt ?? null,
					// Only ever "mine" for this viewer - never the other
					// party's column, regardless of role.
					myNotes:
						(entry.role === "buying"
							? meetup?.buyerNotes
							: meetup?.sellerNotes) ?? null,
				},
			};
		});

		res.status(200).json({ entries: result });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Database error" });
	}
});

const VALID_DAYS = new Set(Object.values(Day));

// POST /api/meetups - upserts the Meetup for one counterpart/role pair.
// buyerUsername/sellerUsername are always derived server-side from
// (myUsername, counterpartUsername, role), never trusted directly from the
// client, so both parties land on the exact same row regardless of who's
// editing.
router.post("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
	try {
		const context = await requireVerifiedContext(req, res);
		if (!context) return;
		const { myUsername, fairId, listId } = context;

		const {
			counterpartUsername,
			role,
			day,
			location,
			time,
			completed,
			notes,
		} = req.body;

		if (typeof counterpartUsername !== "string" || !counterpartUsername) {
			res.status(400).json({ error: "counterpartUsername is required" });
			return;
		}
		if (role !== "buying" && role !== "selling") {
			res.status(400).json({ error: "role must be 'buying' or 'selling'" });
			return;
		}
		if (day !== undefined && day !== null && !VALID_DAYS.has(day)) {
			res.status(400).json({
				error: `day must be one of ${[...VALID_DAYS].join(", ")}, or null`,
			});
			return;
		}
		if (location !== undefined && typeof location !== "string") {
			res.status(400).json({ error: "location must be a string" });
			return;
		}
		if (time !== undefined && typeof time !== "string") {
			res.status(400).json({ error: "time must be a string" });
			return;
		}
		if (completed !== undefined && typeof completed !== "boolean") {
			res.status(400).json({ error: "completed must be a boolean" });
			return;
		}
		if (notes !== undefined && notes !== null && typeof notes !== "string") {
			res.status(400).json({ error: "notes must be a string or null" });
			return;
		}

		const buyerUsername: string =
			role === "buying" ? myUsername : counterpartUsername;
		const sellerUsername: string =
			role === "buying" ? counterpartUsername : myUsername;

		// Defense in depth: only let this pair write a Meetup if there's an
		// actual qualifying transaction between them in this fair, so a
		// verified user can't plant a row for an unrelated username.
		const qualifyingItem = await prisma.item.findFirst({
			where: {
				listId,
				deleted: false,
				hasBids: true,
				highestBidder: buyerUsername,
				username: sellerUsername,
			},
			select: { id: true },
		});
		if (!qualifyingItem) {
			res.status(403).json({
				error: "No matching buying/selling relationship found for this fair.",
			});
			return;
		}

		// completedAt is bumped to now() on every transition to completed:true
		// (never reused from updatedAt - see the model comment), and cleared
		// on the undo path (completed:false) rather than left stale.
		const completedData =
			completed !== undefined
				? { completed, completedAt: completed ? new Date() : null }
				: {};

		// Written to "my" column only, keyed by this request's own role -
		// never the counterpart's, so one side can't see or overwrite the
		// other's private notes.
		const notesData =
			notes !== undefined
				? role === "buying"
					? { buyerNotes: notes }
					: { sellerNotes: notes }
				: {};

		const meetup = await prisma.meetup.upsert({
			where: {
				fairId_buyerUsername_sellerUsername: {
					fairId,
					buyerUsername,
					sellerUsername,
				},
			},
			create: {
				fairId,
				buyerUsername,
				sellerUsername,
				...(day !== undefined ? { day } : {}),
				...(location !== undefined ? { location } : {}),
				...(time !== undefined ? { time } : {}),
				...completedData,
				...notesData,
			},
			update: {
				...(day !== undefined ? { day } : {}),
				...(location !== undefined ? { location } : {}),
				...(time !== undefined ? { time } : {}),
				...completedData,
				...notesData,
			},
		});

		res.status(200).json({
			meetup: {
				day: meetup.day,
				location: meetup.location,
				time: meetup.time,
				completed: meetup.completed,
				completedAt: meetup.completedAt,
				updatedAt: meetup.updatedAt,
				myNotes:
					(role === "buying"
						? meetup.buyerNotes
						: meetup.sellerNotes) ?? null,
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Database error" });
	}
});

export default router;
