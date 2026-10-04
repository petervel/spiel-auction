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
