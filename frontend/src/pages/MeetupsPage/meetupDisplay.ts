import { MeetupDay, MeetupEntry } from '../../hooks/useMeetups';

export const DAY_ORDER: MeetupDay[] = [
	'WEDNESDAY',
	'THURSDAY',
	'FRIDAY',
	'SATURDAY',
	'SUNDAY',
];

export const DAY_LABELS: Record<MeetupDay, string> = {
	WEDNESDAY: 'Wednesday',
	THURSDAY: 'Thursday',
	FRIDAY: 'Friday',
	SATURDAY: 'Saturday',
	SUNDAY: 'Sunday',
};

export const DAY_OPTIONS: { value: MeetupDay | ''; label: string }[] = [
	{ value: '', label: 'Not set' },
	...DAY_ORDER.map((day) => ({ value: day, label: DAY_LABELS[day] })),
];

// Matches the schema's own default (backend's `location` column defaults to
// this exact string) - the one meeting spot with a dropdown shortcut, since
// it's also the one place the grid-square "their spot" coordinate applies.
export const HALL_1A = 'Hall 1A';

// Matches the schema's own default time - uninformative on its own
// (everyone starts there), so nothing bothers showing a time until it's
// been changed away from this.
export const DEFAULT_TIME = '15:00';

// Shared by the page (the collapsed row) and the XLSX export, so the sheet
// people print and bring to the fair never disagrees with what the app
// itself is showing on screen. The default time is only worth hiding for
// the default location - once the location's been overridden to somewhere
// custom, that's a deliberate arrangement and the time (even "15:00")
// matters too, so it's shown regardless.
export const getDisplayTime = (entry: Pick<MeetupEntry, 'meetup'>): string => {
	if (!entry.meetup.day) return '';
	const isCustomLocation = entry.meetup.location !== HALL_1A;
	if (entry.meetup.time === DEFAULT_TIME && !isCustomLocation) return '';
	return entry.meetup.time;
};

export const getDisplayLocation = (
	entry: Pick<MeetupEntry, 'meetup' | 'counterpartLocation'>,
): string => {
	if (entry.meetup.location === HALL_1A) {
		return entry.counterpartLocation?.square ?? '';
	}
	return entry.meetup.location;
};

export const gameNamesOf = (entry: MeetupEntry) =>
	entry.items.map((item) => item.objectName).join(', ');

// Identifies a meetup by its (fairId-scoped) unique pair, same as the
// backend's own @@unique([fairId, buyerUsername, sellerUsername]) - used
// both as the list `key` and to find/highlight a specific entry (e.g. one
// just added/merged via POST /api/meetups/custom) regardless of whatever
// casing the counterpart's username happens to be typed/stored in.
export const meetupKey = (entry: Pick<MeetupEntry, 'role' | 'counterpart'>) =>
	`${entry.role}-${entry.counterpart.toLowerCase()}`;

export const byTimeThenCounterpart = (a: MeetupEntry, b: MeetupEntry) => {
	if (a.meetup.time !== b.meetup.time) {
		return a.meetup.time.localeCompare(b.meetup.time);
	}
	return a.counterpart.localeCompare(b.counterpart);
};

// Time's not a useful sort key here - every unscheduled entry sits on the
// same default "15:00" (there's no day yet to actually attach a time to),
// so sorting by it like the scheduled sections do would just fall through
// to counterpart anyway. Game name is more useful: it's what you're
// scanning for before you've agreed on a day to put someone under.
export const byGameName = (a: MeetupEntry, b: MeetupEntry) =>
	gameNamesOf(a).localeCompare(gameNamesOf(b));

export type DaySection = {
	key: string;
	label: string;
	selling: MeetupEntry[];
	buying: MeetupEntry[];
};

export const makeSection = (
	key: string,
	label: string,
	entries: MeetupEntry[],
	sortFn: (a: MeetupEntry, b: MeetupEntry) => number,
): DaySection => ({
	key,
	label,
	selling: entries.filter((entry) => entry.role === 'selling').sort(sortFn),
	buying: entries.filter((entry) => entry.role === 'buying').sort(sortFn),
});

// Unscheduled first, then only the days that actually have a meetup on
// them - a day nobody has picked yet just doesn't get a heading.
export const groupByDay = (entries: MeetupEntry[]): DaySection[] => {
	const sections: DaySection[] = [];

	const unscheduled = entries.filter((entry) => entry.meetup.day === null);
	if (unscheduled.length > 0) {
		sections.push(
			makeSection('UNSCHEDULED', 'Unscheduled', unscheduled, byGameName),
		);
	}

	for (const day of DAY_ORDER) {
		const dayEntries = entries.filter((entry) => entry.meetup.day === day);
		if (dayEntries.length > 0) {
			sections.push(
				makeSection(day, DAY_LABELS[day], dayEntries, byTimeThenCounterpart),
			);
		}
	}

	return sections;
};

// Most recently completed first - shared by the Completed section (on both
// the main Meetups page and a single day's page) so the two never disagree
// on order.
export const sortByCompletedAtDesc = (
	entries: MeetupEntry[],
): MeetupEntry[] =>
	[...entries].sort((a, b) => {
		const aTime = a.meetup.completedAt
			? new Date(a.meetup.completedAt).getTime()
			: 0;
		const bTime = b.meetup.completedAt
			? new Date(b.meetup.completedAt).getTime()
			: 0;
		return bTime - aTime;
	});

// Matches the TradeFloorGrid's own grid (columns A-E, rows 1-8) - anything
// else is either the unset default or a freeform custom location, neither
// of which has a square to plot.
const SQUARE_PATTERN = /^[A-E][1-8]$/;

// Not-yet-completed meetups only - a completed one's square no longer
// matters, it already happened. Counts by whichever square the meetup
// would actually be found at (see getDisplayLocation), not any fixed side's
// own location, so both buying and selling entries plot correctly.
export const computeSquareCounts = (
	entries: MeetupEntry[],
): Record<string, number> => {
	const counts: Record<string, number> = {};
	for (const entry of entries) {
		const square = getDisplayLocation(entry);
		if (!SQUARE_PATTERN.test(square)) continue;
		counts[square] = (counts[square] ?? 0) + 1;
	}
	return counts;
};

// Same squares as computeSquareCounts, broken down by role instead of
// just totaled - lets the map color a square by whether it's a buying
// meetup, a selling one, or both (see TradeFloorGrid's roleCounts prop).
export const computeSquareRoleCounts = (
	entries: MeetupEntry[],
): Record<string, { buying: number; selling: number }> => {
	const counts: Record<string, { buying: number; selling: number }> = {};
	for (const entry of entries) {
		const square = getDisplayLocation(entry);
		if (!SQUARE_PATTERN.test(square)) continue;
		const bucket = counts[square] ?? { buying: 0, selling: 0 };
		bucket[entry.role] += 1;
		counts[square] = bucket;
	}
	return counts;
};
