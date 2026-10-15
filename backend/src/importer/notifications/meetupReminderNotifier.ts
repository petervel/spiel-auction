import { Day } from "@prisma/client";
import prisma from "../../prismaClient";
import { sendPushToUser } from "../../push/webPushClient";
import { getUserIdsByUsername } from "../usersByBggUsername";

// Spiel Essen only - this app has no notion of a fair's own timezone, and
// every other hardcoded "Hall 1A"/"15:00" default already assumes it (see
// meetupDisplay.ts's HALL_1A/DEFAULT_TIME on the frontend, and the schema's
// own column defaults on Meetup).
const FAIR_TIMEZONE = "Europe/Berlin";
const REMINDER_LOCATION = "Hall 1A";
const REMINDER_TIME = "15:00";

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

// Runs once a day at 14:30 Europe/Berlin (see cli-importer.ts) - 30 minutes
// before the schema's own default meetup time. Only reminds about meetups
// still at that default location/time - one moved to a custom arrangement
// is something the pair already agreed on themselves, not something this
// generic "trading starts soon" nudge needs to cover.
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

const buildBody = (count: number, square: string | null) => {
	const tradeWord = count === 1 ? "trade" : "trades";
	const squarePart = square ? `Your spot is ${square}.` : "";
	return `You have ${count} ${tradeWord} at ${REMINDER_LOCATION}, ${REMINDER_TIME}. ${squarePart}`;
};

const sendRemindersForFair = async (fairId: number, today: Day) => {
	const meetups = await prisma.meetup.findMany({
		where: {
			fairId,
			day: today,
			location: REMINDER_LOCATION,
			time: REMINDER_TIME,
			completed: false,
		},
		select: { buyerUsername: true, sellerUsername: true },
	});
	if (meetups.length === 0) return;

	// Each side of a meetup counts as one of "their" trades - a username
	// that's party to 3 such rows (as either buyer or seller) has 3
	// trades, same as the meetups page's own count.
	const countsByUsername = new Map<string, number>();
	for (const meetup of meetups) {
		for (const username of [meetup.buyerUsername, meetup.sellerUsername]) {
			const key = username.trim().toLowerCase();
			countsByUsername.set(key, (countsByUsername.get(key) ?? 0) + 1);
		}
	}

	const userIdsByUsername = await getUserIdsByUsername([
		...countsByUsername.keys(),
	]);

	// A username's count is credited to every account that resolves to it
	// (see getUserIdsByUsername - two accounts can legitimately share one
	// real BGG username), summed if an account somehow matches more than
	// one of this fair's usernames.
	const countsByUserId = new Map<number, number>();
	for (const [username, count] of countsByUsername) {
		for (const userId of userIdsByUsername.get(username) ?? []) {
			countsByUserId.set(userId, (countsByUserId.get(userId) ?? 0) + count);
		}
	}
	if (countsByUserId.size === 0) return;

	const users = await prisma.user.findMany({
		where: {
			id: { in: [...countsByUserId.keys()] },
			notifyOnMeetupReminder: true,
		},
		include: {
			fairs: { where: { fairId }, select: { locationSquare: true } },
		},
	});

	const url = `/meetups/${today.toLowerCase()}`;

	await Promise.all(
		users.map((user) =>
			sendPushToUser(user.id, {
				title: "Trading starts in 30 minutes",
				body: buildBody(
					countsByUserId.get(user.id)!,
					user.fairs[0]?.locationSquare ?? null,
				),
				icon: "/icon/notify-meetup.svg",
				url,
			}),
		),
	);
};
