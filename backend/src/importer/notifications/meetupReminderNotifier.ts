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

const DAY_VALUES: string[] = Object.values(Day);

// Resolves to null outside WEDNESDAY-SUNDAY (including every day of a week
// with no fair running at all) - callers no-op on null rather than firing
// on, say, a stray Tuesday.
const currentDayInFairTimezone = (): Day | null => {
	const weekday = new Intl.DateTimeFormat("en-US", {
		timeZone: FAIR_TIMEZONE,
		weekday: "long",
	})
		.format(new Date())
		.toUpperCase();
	return DAY_VALUES.includes(weekday) ? (weekday as Day) : null;
};

// Runs once a day at 14:30 Europe/Berlin (see cli-importer.ts) - 30 minutes
// before the schema's own default meetup time. Only reminds about meetups
// still at that default location/time - one moved to a custom arrangement
// is something the pair already agreed on themselves, not something this
// generic "trading starts soon" nudge needs to cover.
export const sendMeetupReminders = async () => {
	const today = currentDayInFairTimezone();
	if (!today) return;

	const fairs = await prisma.fair.findMany({
		where: { status: "ACTIVE" },
		select: { id: true },
	});

	await Promise.all(fairs.map((fair) => sendRemindersForFair(fair.id, today)));
};

const buildBody = (count: number, square: string | null) => {
	const tradeWord = count === 1 ? "trade" : "trades";
	const squarePart = square
		? `Your spot is ${square}.`
		: "";
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
