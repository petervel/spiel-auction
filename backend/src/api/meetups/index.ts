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

// completed/completedAt/messageSent/prepaid/notifyReminder are per-side
// columns (buyerX/sellerX) - this resolves "mine" from role, same as
// myNotes already does below. Never the counterpart's column, regardless
// of role.
const myMeetupFields = (
	meetup:
		| {
				buyerCompleted: boolean;
				buyerCompletedAt: Date | null;
				sellerCompleted: boolean;
				sellerCompletedAt: Date | null;
				buyerMessageSent: boolean;
				sellerMessageSent: boolean;
				buyerPrepaid: boolean;
				sellerPrepaid: boolean;
				buyerNotifyReminder: boolean | null;
				sellerNotifyReminder: boolean | null;
		  }
		| null
		| undefined,
	role: Role,
) => ({
	completed:
		(role === "buying" ? meetup?.buyerCompleted : meetup?.sellerCompleted) ??
		false,
	completedAt:
		(role === "buying"
			? meetup?.buyerCompletedAt
			: meetup?.sellerCompletedAt) ?? null,
	messageSent:
		(role === "buying"
			? meetup?.buyerMessageSent
			: meetup?.sellerMessageSent) ?? false,
	prepaid:
		(role === "buying" ? meetup?.buyerPrepaid : meetup?.sellerPrepaid) ??
		false,
	// Raw tri-state override, not resolved against the account's own
	// default here - the API has no reason to know that default, and the
	// frontend already has it (useNotificationPreferences) to combine with
	// this itself.
	notifyReminder:
		(role === "buying"
			? meetup?.buyerNotifyReminder
			: meetup?.sellerNotifyReminder) ?? null,
});

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

		// Custom meetups (see POST /api/meetups/custom) have no backing Item,
		// so they're invisible to the buyingItems/sellingItems queries above -
		// fetched directly by participant instead, and merged in as their own
		// entry (items: []) if one doesn't already exist for that pair.
		const customMeetups = await prisma.meetup.findMany({
			where: {
				fairId,
				isCustom: true,
				OR: [{ buyerUsername: myUsername }, { sellerUsername: myUsername }],
			},
		});
		for (const meetup of customMeetups) {
			const isBuyer =
				meetup.buyerUsername.toLowerCase() === myUsername.toLowerCase();
			const role: Role = isBuyer ? "buying" : "selling";
			const counterpart = isBuyer
				? meetup.sellerUsername
				: meetup.buyerUsername;
			const key = `${role}:${counterpart.toLowerCase()}`;
			if (!entriesByKey.has(key)) {
				entriesByKey.set(key, { role, counterpart, items: [] });
			}
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
			// Trimmed as well as lowercased - see usersByBggUsername.ts for
			// why a legacy row can still carry whitespace a plain JS Map/
			// object key compare won't forgive the way MySQL's collation does.
			const key = row.user.bggUsername?.trim().toLowerCase();
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
					...myMeetupFields(meetup, entry.role),
					updatedAt: meetup?.updatedAt ?? null,
					lastEditedBy: meetup?.lastEditedBy ?? null,
					// Additive, never a replacement for the real item names/price
					// above - a custom description can exist alongside a genuine
					// bid relationship with the same counterpart (see POST
					// /api/meetups/custom).
					customDescription: meetup?.customDescription ?? null,
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
			messageSent,
			prepaid,
			notifyReminder,
			notes,
			description,
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
		if (messageSent !== undefined && typeof messageSent !== "boolean") {
			res.status(400).json({ error: "messageSent must be a boolean" });
			return;
		}
		if (prepaid !== undefined && typeof prepaid !== "boolean") {
			res.status(400).json({ error: "prepaid must be a boolean" });
			return;
		}
		if (
			notifyReminder !== undefined &&
			notifyReminder !== null &&
			typeof notifyReminder !== "boolean"
		) {
			res
				.status(400)
				.json({ error: "notifyReminder must be a boolean or null" });
			return;
		}
		if (notes !== undefined && notes !== null && typeof notes !== "string") {
			res.status(400).json({ error: "notes must be a string or null" });
			return;
		}
		if (
			description !== undefined &&
			(typeof description !== "string" || !description.trim())
		) {
			res.status(400).json({ error: "description must be a non-empty string" });
			return;
		}

		const buyerUsername: string =
			role === "buying" ? myUsername : counterpartUsername;
		const sellerUsername: string =
			role === "buying" ? counterpartUsername : myUsername;

		// Defense in depth: only let this pair write a Meetup if there's an
		// actual qualifying transaction between them in this fair, so a
		// verified user can't plant a row for an unrelated username. A
		// pre-existing custom meetup (POST /api/meetups/custom) also
		// qualifies - that's its own legitimate, already-verified claim to
		// this pair, just not one backed by a bid.
		const [qualifyingItem, existingMeetup] = await Promise.all([
			prisma.item.findFirst({
				where: {
					listId,
					deleted: false,
					hasBids: true,
					highestBidder: buyerUsername,
					username: sellerUsername,
				},
				select: { id: true },
			}),
			prisma.meetup.findUnique({
				where: {
					fairId_buyerUsername_sellerUsername: {
						fairId,
						buyerUsername,
						sellerUsername,
					},
				},
				select: { isCustom: true },
			}),
		]);
		if (!qualifyingItem && !existingMeetup?.isCustom) {
			res.status(403).json({
				error: "No matching buying/selling relationship found for this fair.",
			});
			return;
		}

		// Editing the description is only meaningful for a meetup that's
		// already custom - giving one to an ordinary bid-backed meetup is
		// POST /api/meetups/custom's job, not this endpoint's.
		if (description !== undefined && !existingMeetup?.isCustom) {
			res.status(400).json({
				error: "This meetup has no custom description to edit.",
			});
			return;
		}

		// completed/completedAt and messageSent are per-side (buyerX/sellerX) -
		// written to "my" column only, keyed by this request's own role, same
		// as notes below. *CompletedAt is bumped to now() on every transition
		// to completed:true (never reused from updatedAt - see the model
		// comment), and cleared on the undo path (completed:false) rather than
		// left stale.
		const completedData =
			completed !== undefined
				? role === "buying"
					? {
							buyerCompleted: completed,
							buyerCompletedAt: completed ? new Date() : null,
						}
					: {
							sellerCompleted: completed,
							sellerCompletedAt: completed ? new Date() : null,
						}
				: {};

		const messageSentData =
			messageSent !== undefined
				? role === "buying"
					? { buyerMessageSent: messageSent }
					: { sellerMessageSent: messageSent }
				: {};

		const prepaidData =
			prepaid !== undefined
				? role === "buying"
					? { buyerPrepaid: prepaid }
					: { sellerPrepaid: prepaid }
				: {};

		const notifyReminderData =
			notifyReminder !== undefined
				? role === "buying"
					? { buyerNotifyReminder: notifyReminder }
					: { sellerNotifyReminder: notifyReminder }
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

		const descriptionData =
			description !== undefined
				? { customDescription: description.trim() }
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
				lastEditedBy: myUsername,
				...(day !== undefined ? { day } : {}),
				...(location !== undefined ? { location } : {}),
				...(time !== undefined ? { time } : {}),
				...completedData,
				...messageSentData,
				...prepaidData,
				...notifyReminderData,
				...notesData,
				...descriptionData,
			},
			update: {
				lastEditedBy: myUsername,
				...(day !== undefined ? { day } : {}),
				...(location !== undefined ? { location } : {}),
				...(time !== undefined ? { time } : {}),
				...completedData,
				...messageSentData,
				...prepaidData,
				...notifyReminderData,
				...notesData,
				...descriptionData,
			},
		});

		res.status(200).json({
			meetup: {
				day: meetup.day,
				location: meetup.location,
				time: meetup.time,
				...myMeetupFields(meetup, role),
				updatedAt: meetup.updatedAt,
				lastEditedBy: meetup.lastEditedBy,
				customDescription: meetup.customDescription,
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

// POST /api/meetups/custom - adds a meetup with a counterpart that isn't
// (or isn't only) backed by a real bid relationship, e.g. meeting up for
// something outside the auction, or an addendum like "also bringing you a
// gift" on top of a genuine buying/selling pair. Unlike POST /, there's no
// qualifyingItem check - the verified context itself is the only
// authorization needed to make this specific, explicit claim.
router.post(
	"/custom",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const context = await requireVerifiedContext(req, res);
			if (!context) return;
			const { myUsername, fairId } = context;

			const { counterpartUsername, role, description } = req.body;

			if (
				typeof counterpartUsername !== "string" ||
				!counterpartUsername.trim()
			) {
				res.status(400).json({ error: "counterpartUsername is required" });
				return;
			}
			if (role !== "buying" && role !== "selling") {
				res.status(400).json({ error: "role must be 'buying' or 'selling'" });
				return;
			}
			if (typeof description !== "string" || !description.trim()) {
				res.status(400).json({ error: "description is required" });
				return;
			}

			const counterpart = counterpartUsername.trim();
			if (counterpart.toLowerCase() === myUsername.toLowerCase()) {
				res
					.status(400)
					.json({ error: "You can't add a meetup with yourself." });
				return;
			}

			const buyerUsername = role === "buying" ? myUsername : counterpart;
			const sellerUsername = role === "buying" ? counterpart : myUsername;

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
					isCustom: true,
					customDescription: description.trim(),
					lastEditedBy: myUsername,
				},
				update: {
					isCustom: true,
					customDescription: description.trim(),
					lastEditedBy: myUsername,
				},
			});

			res.status(200).json({
				meetup: {
					day: meetup.day,
					location: meetup.location,
					time: meetup.time,
					...myMeetupFields(meetup, role),
					updatedAt: meetup.updatedAt,
					lastEditedBy: meetup.lastEditedBy,
					customDescription: meetup.customDescription,
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
	},
);

// PATCH /api/meetups/custom - changes who a custom meetup is with, plus
// whatever other fields are given, in one write. Only ever for a pure
// custom meetup (no real bid relationship) - one that's also a genuine
// buying/selling pair is locked to whoever actually bid, same restriction
// as DELETE /custom's "clear, don't remove" branch, just stricter (reject
// outright rather than partially apply).
router.patch(
	"/custom",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const context = await requireVerifiedContext(req, res);
			if (!context) return;
			const { myUsername, fairId, listId } = context;

			const {
				counterpartUsername,
				role,
				newCounterpartUsername,
				day,
				location,
				time,
				completed,
				messageSent,
				prepaid,
				notifyReminder,
				notes,
				description,
			} = req.body;

			if (
				typeof counterpartUsername !== "string" ||
				!counterpartUsername.trim()
			) {
				res.status(400).json({ error: "counterpartUsername is required" });
				return;
			}
			if (role !== "buying" && role !== "selling") {
				res.status(400).json({ error: "role must be 'buying' or 'selling'" });
				return;
			}
			if (
				typeof newCounterpartUsername !== "string" ||
				!newCounterpartUsername.trim()
			) {
				res
					.status(400)
					.json({ error: "newCounterpartUsername is required" });
				return;
			}
			if (typeof description !== "string" || !description.trim()) {
				res.status(400).json({ error: "description is required" });
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
			if (messageSent !== undefined && typeof messageSent !== "boolean") {
				res.status(400).json({ error: "messageSent must be a boolean" });
				return;
			}
			if (prepaid !== undefined && typeof prepaid !== "boolean") {
				res.status(400).json({ error: "prepaid must be a boolean" });
				return;
			}
			if (
				notifyReminder !== undefined &&
				notifyReminder !== null &&
				typeof notifyReminder !== "boolean"
			) {
				res
					.status(400)
					.json({ error: "notifyReminder must be a boolean or null" });
				return;
			}
			if (notes !== undefined && notes !== null && typeof notes !== "string") {
				res.status(400).json({ error: "notes must be a string or null" });
				return;
			}

			const oldCounterpart = counterpartUsername.trim();
			const newCounterpart = newCounterpartUsername.trim();
			if (newCounterpart.toLowerCase() === myUsername.toLowerCase()) {
				res
					.status(400)
					.json({ error: "You can't add a meetup with yourself." });
				return;
			}

			const oldBuyerUsername =
				role === "buying" ? myUsername : oldCounterpart;
			const oldSellerUsername =
				role === "buying" ? oldCounterpart : myUsername;

			const existingMeetup = await prisma.meetup.findUnique({
				where: {
					fairId_buyerUsername_sellerUsername: {
						fairId,
						buyerUsername: oldBuyerUsername,
						sellerUsername: oldSellerUsername,
					},
				},
			});
			if (!existingMeetup?.isCustom) {
				res
					.status(404)
					.json({ error: "No custom meetup found for this pair." });
				return;
			}

			const qualifyingItem = await prisma.item.findFirst({
				where: {
					listId,
					deleted: false,
					hasBids: true,
					highestBidder: oldBuyerUsername,
					username: oldSellerUsername,
				},
				select: { id: true },
			});
			if (qualifyingItem) {
				res.status(400).json({
					error:
						"Can't change the trade partner for a meetup backed by a real auction relationship.",
				});
				return;
			}

			const newBuyerUsername =
				role === "buying" ? myUsername : newCounterpart;
			const newSellerUsername =
				role === "buying" ? newCounterpart : myUsername;

			if (
				newBuyerUsername.toLowerCase() !== oldBuyerUsername.toLowerCase() ||
				newSellerUsername.toLowerCase() !== oldSellerUsername.toLowerCase()
			) {
				const conflict = await prisma.meetup.findUnique({
					where: {
						fairId_buyerUsername_sellerUsername: {
							fairId,
							buyerUsername: newBuyerUsername,
							sellerUsername: newSellerUsername,
						},
					},
					select: { id: true },
				});
				if (conflict) {
					res.status(409).json({
						error: "You already have a meetup with that person in this role.",
					});
					return;
				}
			}

			const completedData =
				completed !== undefined
					? role === "buying"
						? {
								buyerCompleted: completed,
								buyerCompletedAt: completed ? new Date() : null,
							}
						: {
								sellerCompleted: completed,
								sellerCompletedAt: completed ? new Date() : null,
							}
					: {};
			const messageSentData =
				messageSent !== undefined
					? role === "buying"
						? { buyerMessageSent: messageSent }
						: { sellerMessageSent: messageSent }
					: {};
			const prepaidData =
				prepaid !== undefined
					? role === "buying"
						? { buyerPrepaid: prepaid }
						: { sellerPrepaid: prepaid }
					: {};
			const notifyReminderData =
				notifyReminder !== undefined
					? role === "buying"
						? { buyerNotifyReminder: notifyReminder }
						: { sellerNotifyReminder: notifyReminder }
					: {};
			const notesData =
				notes !== undefined
					? role === "buying"
						? { buyerNotes: notes }
						: { sellerNotes: notes }
					: {};

			const meetup = await prisma.meetup.update({
				where: { id: existingMeetup.id },
				data: {
					buyerUsername: newBuyerUsername,
					sellerUsername: newSellerUsername,
					lastEditedBy: myUsername,
					customDescription: description.trim(),
					...(day !== undefined ? { day } : {}),
					...(location !== undefined ? { location } : {}),
					...(time !== undefined ? { time } : {}),
					...completedData,
					...messageSentData,
					...prepaidData,
					...notifyReminderData,
					...notesData,
				},
			});

			res.status(200).json({
				meetup: {
					counterpartUsername: newCounterpart,
					day: meetup.day,
					location: meetup.location,
					time: meetup.time,
					...myMeetupFields(meetup, role),
					updatedAt: meetup.updatedAt,
					lastEditedBy: meetup.lastEditedBy,
					customDescription: meetup.customDescription,
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
	},
);

// DELETE /api/meetups/custom - removes a custom meetup. If the pair has no
// real bid relationship backing it, the whole row goes - it only existed
// because of this custom claim. If it does (an addendum on a genuine
// buying/selling pair, see POST /custom), only the custom fields are
// cleared; the real meetup (day/time/location/notes) stays, since that
// relationship is still real and shouldn't vanish along with the addendum.
router.delete(
	"/custom",
	authenticateUser,
	async (req: AuthenticatedRequest, res) => {
		try {
			const context = await requireVerifiedContext(req, res);
			if (!context) return;
			const { myUsername, fairId, listId } = context;

			const { counterpartUsername, role } = req.body;

			if (
				typeof counterpartUsername !== "string" ||
				!counterpartUsername.trim()
			) {
				res.status(400).json({ error: "counterpartUsername is required" });
				return;
			}
			if (role !== "buying" && role !== "selling") {
				res.status(400).json({ error: "role must be 'buying' or 'selling'" });
				return;
			}

			const counterpart = counterpartUsername.trim();
			const buyerUsername = role === "buying" ? myUsername : counterpart;
			const sellerUsername = role === "buying" ? counterpart : myUsername;
			const where = {
				fairId_buyerUsername_sellerUsername: {
					fairId,
					buyerUsername,
					sellerUsername,
				},
			};

			const existingMeetup = await prisma.meetup.findUnique({
				where,
				select: { isCustom: true },
			});
			if (!existingMeetup?.isCustom) {
				res
					.status(404)
					.json({ error: "No custom meetup found for this pair." });
				return;
			}

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

			if (qualifyingItem) {
				await prisma.meetup.update({
					where,
					data: {
						isCustom: false,
						customDescription: null,
						lastEditedBy: myUsername,
					},
				});
			} else {
				await prisma.meetup.delete({ where });
			}

			res.status(200).json({ success: true });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Database error" });
		}
	},
);

export default router;
