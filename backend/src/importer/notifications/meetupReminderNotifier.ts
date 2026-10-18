import { Day } from "@prisma/client";
import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { getUserIdsByUsername } from "../usersByBggUsername";

// Spiel Essen only - this app has no notion of a fair's own timezone (see
// the schema's own "Hall 1A"/"15:00" column defaults, which assume it too).
const FAIR_TIMEZONE = "Europe/Berlin";
const REMINDER_MINUTES_BEFORE = 30;

// The schema's own defaults - a meetup still sitting at both of these is
// one of the generic daily batch (never explicitly scheduled), which gets
// the richer "N trades, your spot is X" message since it's genuinely one
// shared time/place. Anything moved off either default is a one-off
// arrangement with its own time, which can't be worded that way.
const DEFAULT_LOCATION = "Hall 1A";
const DEFAULT_TIME = "15:00";

// Offset in whole days from Fair.eventDate (its official opening day -
// always a Thursday for Essen Spiel, though the calendar date moves every
// year) to each possible meetup day. WEDNESDAY is early-trader access,
// the day before the official opening.
const DAY_OFFSET_FROM_EVENT_DATE: Record<Day, number> = {
	WEDNESDAY: -1,
	THURSDAY: 0,
	FRIDAY: 1,
	SATURDAY: 2,
	SUNDAY: 3,
};

// "YYYY-MM-DD" in the fair's own timezone, not the server's - a date-only
// comparison against Fair.eventDate (itself just a calendar date, no
// meaningful time component), so this never depends on what time of day it
// happens to be on either side.
const todayDateStringInFairTimezone = (): string =>
	new Intl.DateTimeFormat("en-CA", { timeZone: FAIR_TIMEZONE }).format(
		new Date(),
	);

// Resolves "today" to a MeetupDay for this specific fair, by its own
// eventDate - not just by weekday name, which would otherwise match every
// single week of the year, not just fair week (this is exactly the bug
// that prompted using eventDate here). Null if today isn't WEDNESDAY-
// SUNDAY of this fair's own week at all.
const resolveTodayForFair = (eventDate: Date): Day | null => {
	const todayUtcMidnight = new Date(
		`${todayDateStringInFairTimezone()}T00:00:00.000Z`,
	);
	const eventUtcMidnight = new Date(
		`${eventDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
	);
	const offsetDays = Math.round(
		(todayUtcMidnight.getTime() - eventUtcMidnight.getTime()) / 86_400_000,
	);

	const match = (
		Object.entries(DAY_OFFSET_FROM_EVENT_DATE) as [Day, number][]
	).find(([, offset]) => offset === offsetDays);
	return match?.[0] ?? null;
};

// Minutes since midnight, in the fair's own timezone - compared directly
// against a parsed meetup.time rather than building Date instants, which
// would otherwise have to account for Europe/Berlin's own DST transition
// (Spiel Essen sometimes straddles it).
const currentMinuteOfDayInFairTimezone = (): number => {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: FAIR_TIMEZONE,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date());
	const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
	const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
	return hour * 60 + minute;
};

const parseTimeToMinutes = (time: string): number | null => {
	const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
	if (!match) return null;
	return Number(match[1]) * 60 + Number(match[2]);
};

const buildDefaultSlotBody = (count: number, square: string | null) => {
	const tradeWord = count === 1 ? "trade" : "trades";
	const squarePart = square ? `Your spot is ${square}.` : "";
	return `You have ${count} ${tradeWord} at ${DEFAULT_LOCATION}, ${DEFAULT_TIME}. ${squarePart}`;
};

// Unlike the default-slot batch, these don't share one time/place, so each
// has to say its own - "Meetup reminder" alone gave no way to tell where
// to go or when to be there.
const buildCustomSlotBody = (
	entries: { time: string; location: string }[],
) => {
	if (entries.length === 1) {
		return `You have a meetup at ${entries[0].location}, ${entries[0].time}.`;
	}
	const parts = entries.map((e) => `${e.time} at ${e.location}`);
	return `You have ${entries.length} meetups coming up: ${parts.join("; ")}.`;
};

// Runs every minute (see cli-importer.ts) and reminds about every meetup
// due in the next 30 minutes, whatever day/time/location it's actually
// set to - not just ones still sitting at the schema's default "Hall 1A,
// 15:00". A custom arrangement is still something worth a nudge about,
// just with a plainer message (see buildDefaultSlotBody vs the generic
// "Meetup reminder" text below).
export const sendMeetupReminders = async () => {
	const fairs = await prisma.fair.findMany({
		where: { status: "ACTIVE" },
		select: { id: true, eventDate: true },
	});

	const dueToday = fairs
		.map((fair) => ({ fairId: fair.id, today: resolveTodayForFair(fair.eventDate) }))
		.filter(
			(entry): entry is { fairId: number; today: Day } => entry.today !== null,
		);

	await Promise.all(
		dueToday.map(({ fairId, today }) => sendRemindersForFair(fairId, today)),
	);
};

type Side = "buyer" | "seller";

const sendRemindersForFair = async (fairId: number, today: Day) => {
	const nowMinutes = currentMinuteOfDayInFairTimezone();

	// A cheap first pass - only rows that could still need a reminder for
	// at least one side. Exact per-meetup timing is checked below, since
	// that needs each row's own `time` parsed first.
	const meetups = await prisma.meetup.findMany({
		where: {
			fairId,
			day: today,
			OR: [{ buyerReminderSentAt: null }, { sellerReminderSentAt: null }],
		},
		select: {
			id: true,
			time: true,
			location: true,
			buyerUsername: true,
			sellerUsername: true,
			buyerCompleted: true,
			sellerCompleted: true,
			buyerNotifyReminder: true,
			sellerNotifyReminder: true,
			buyerReminderSentAt: true,
			sellerReminderSentAt: true,
		},
	});
	if (meetups.length === 0) return;

	// Every side landing in its own 30-minutes-before window right now -
	// a side that's already completed its own meetup, or already been
	// reminded, is skipped (the other side, if still eligible, isn't).
	type DueSide = {
		meetupId: number;
		side: Side;
		username: string;
		isDefaultSlot: boolean;
	};
	const dueSides: DueSide[] = [];
	for (const meetup of meetups) {
		const meetupMinutes = parseTimeToMinutes(meetup.time);
		if (meetupMinutes === null) continue;
		const minutesUntil = meetupMinutes - nowMinutes;
		if (minutesUntil < 0 || minutesUntil > REMINDER_MINUTES_BEFORE) continue;

		const isDefaultSlot =
			meetup.location === DEFAULT_LOCATION && meetup.time === DEFAULT_TIME;

		if (!meetup.buyerCompleted && meetup.buyerReminderSentAt === null) {
			dueSides.push({
				meetupId: meetup.id,
				side: "buyer",
				username: meetup.buyerUsername,
				isDefaultSlot,
			});
		}
		if (!meetup.sellerCompleted && meetup.sellerReminderSentAt === null) {
			dueSides.push({
				meetupId: meetup.id,
				side: "seller",
				username: meetup.sellerUsername,
				isDefaultSlot,
			});
		}
	}
	if (dueSides.length === 0) return;

	const meetupById = new Map(meetups.map((m) => [m.id, m]));

	const usernames = [
		...new Set(dueSides.map((d) => d.username.trim().toLowerCase())),
	];
	const userIdsByUsername = await getUserIdsByUsername(usernames);

	// Resolved to accounts, carrying this side's own per-meetup override
	// (null = no override, defer to that account's Settings preference,
	// checked next once we know the account) and whether it's one of the
	// generic default-slot meetups.
	type PendingSide = {
		meetupId: number;
		side: Side;
		userId: number;
		override: boolean | null;
		isDefaultSlot: boolean;
	};
	const pending: PendingSide[] = [];
	for (const due of dueSides) {
		const meetup = meetupById.get(due.meetupId)!;
		const override =
			due.side === "buyer"
				? meetup.buyerNotifyReminder
				: meetup.sellerNotifyReminder;
		const key = due.username.trim().toLowerCase();
		for (const userId of userIdsByUsername.get(key) ?? []) {
			pending.push({
				meetupId: due.meetupId,
				side: due.side,
				userId,
				override,
				isDefaultSlot: due.isDefaultSlot,
			});
		}
	}

	const userIds = [...new Set(pending.map((p) => p.userId))];
	const users =
		userIds.length === 0
			? []
			: await prisma.user.findMany({
					where: { id: { in: userIds } },
					select: {
						id: true,
						notifyOnMeetupReminder: true,
						fairs: { where: { fairId }, select: { locationSquare: true } },
					},
				});
	const userById = new Map(users.map((u) => [u.id, u]));

	// An explicit per-meetup override always wins; null falls back to that
	// account's own global Settings preference (see the bell icon in
	// MeetupRowDetails / the Meetup model comment).
	const enabled = pending.filter((p) => {
		const user = userById.get(p.userId);
		return user && (p.override ?? user.notifyOnMeetupReminder);
	});

	// Grouped separately per user - a default-slot batch gets one richer
	// "N trades" push (they all share the one time/place), a custom-slot
	// batch gets its own, listing each meetup's own time/place since those
	// can all differ.
	const defaultSlotCountByUserId = new Map<number, number>();
	const customSlotEntriesByUserId = new Map<
		number,
		{ time: string; location: string }[]
	>();
	for (const p of enabled) {
		if (p.isDefaultSlot) {
			defaultSlotCountByUserId.set(
				p.userId,
				(defaultSlotCountByUserId.get(p.userId) ?? 0) + 1,
			);
			continue;
		}
		const meetup = meetupById.get(p.meetupId)!;
		const entries = customSlotEntriesByUserId.get(p.userId) ?? [];
		entries.push({ time: meetup.time, location: meetup.location });
		customSlotEntriesByUserId.set(p.userId, entries);
	}

	const url = `/meetups/${today.toLowerCase()}`;
	const sends: Promise<unknown>[] = [];
	for (const [userId, count] of defaultSlotCountByUserId) {
		const square = userById.get(userId)?.fairs[0]?.locationSquare ?? null;
		sends.push(
			sendPushToUser(userId, {
				title: "Trading starts in 30 minutes",
				body: buildDefaultSlotBody(count, square),
				icon: "/icon/notify-meetup.svg",
				url,
			}),
		);
	}
	for (const [userId, entries] of customSlotEntriesByUserId) {
		sends.push(
			sendPushToUser(userId, {
				title: "Meetup reminder",
				body: buildCustomSlotBody(entries),
				icon: "/icon/notify-meetup.svg",
				url,
			}),
		);
	}
	await Promise.all(sends);

	// Every evaluated side is marked sent now, whether or not it actually
	// got a push (opted out, or the username didn't resolve to any
	// account) - otherwise an ineligible side would just keep getting
	// re-evaluated every minute for the rest of its own 30-minute window.
	const buyerMeetupIds = dueSides
		.filter((d) => d.side === "buyer")
		.map((d) => d.meetupId);
	const sellerMeetupIds = dueSides
		.filter((d) => d.side === "seller")
		.map((d) => d.meetupId);
	const now = new Date();
	await Promise.all([
		buyerMeetupIds.length === 0
			? Promise.resolve()
			: prisma.meetup.updateMany({
					where: { id: { in: buyerMeetupIds } },
					data: { buyerReminderSentAt: now },
				}),
		sellerMeetupIds.length === 0
			? Promise.resolve()
			: prisma.meetup.updateMany({
					where: { id: { in: sellerMeetupIds } },
					data: { sellerReminderSentAt: now },
				}),
	]);
};
