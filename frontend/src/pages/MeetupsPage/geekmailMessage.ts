import { GeekmailSettings } from '../../hooks/useGeekmailSettings';
import { MeetupDay, MeetupEntry } from '../../hooks/useMeetups';
import { DAY_LABELS, DAY_ORDER, HALL_1A } from './meetupDisplay';

// Geekmail's own compose form - see https://boardgamegeek.com/geekmail/compose.
const GEEKMAIL_COMPOSE_URL = 'https://boardgamegeek.com/geekmail/compose';

// BGG subjects get cut off somewhere past this, so the game list is
// truncated to fit rather than silently chopped mid-word by BGG itself.
export const SUBJECT_MAX_LENGTH = 75;
const AND_MORE = ' and more.';

const joinNatural = (items: string[]): string => {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0];
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

// "Thursday or Friday" for two, "Wednesday, Thursday or Friday" for three+,
// always in calendar order regardless of selection order.
export const buildDayText = (preferredTradeDays: MeetupDay[]): string => {
	const labels = DAY_ORDER.filter((day) =>
		preferredTradeDays.includes(day)
	).map((day) => DAY_LABELS[day]);

	if (labels.length === 0) return 'a day during the show';
	if (labels.length === 1) return labels[0];
	return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
};

// Where to tell the recipient *I'll* be, not where they said they'd be -
// a custom meetup location is specific enough to use as-is, but "Hall 1A"
// alone just means nothing's been agreed, so it's filled out with my own
// declared trade-floor square (set in Settings > Meetup location) instead,
// e.g. "Hall 1A - E5".
export const buildLocationText = (
	meetupLocation: string,
	mySquare: string | null | undefined
): string => {
	if (meetupLocation !== HALL_1A) return meetupLocation;
	return mySquare ? `${HALL_1A} - ${mySquare}` : HALL_1A;
};

// Sorted priciest-first, then as many as fit in `maxLength` before handing
// back whatever's left over to be collapsed into "and more." - always
// keeps at least the single priciest game, even if it alone doesn't fit.
const buildGameList = (
	items: Pick<MeetupEntry['items'][number], 'objectName' | 'currentBid'>[],
	maxLength: number
): { text: string; truncated: boolean } => {
	const names = [...items]
		.sort((a, b) => (b.currentBid ?? 0) - (a.currentBid ?? 0))
		.map((item) => item.objectName);

	const full = names.join(', ');
	if (full.length <= maxLength) return { text: full, truncated: false };

	const budget = maxLength - AND_MORE.length;
	let text = '';
	for (const name of names) {
		const next = text ? `${text}, ${name}` : name;
		if (next.length > budget) break;
		text = next;
	}

	return { text: text || names[0], truncated: true };
};

// "You won the auction for X, Y and more." when messaging a buyer (they're
// the one who won), or just "X, Y and more." when messaging a seller -
// capped at SUBJECT_MAX_LENGTH total, truncating the game list (priciest
// first) rather than the fixed prefix.
export const buildSubject = (entry: MeetupEntry): string => {
	const prefix = entry.role === 'selling' ? 'You won the auction for ' : '';
	const { text, truncated } = buildGameList(
		entry.items,
		SUBJECT_MAX_LENGTH - prefix.length
	);
	return `${prefix}${text}${truncated ? AND_MORE : ''}`;
};

export type GeekmailMessage = {
	to: string;
	subject: string;
	body: string;
};

// Fills in the role-appropriate template (seller template when I'm the
// seller messaging the buyer, buyer template the other way round) with
// this meetup's actual data. The game list here is never truncated -
// that's only a subject-line concern (see buildSubject). myLocationSquare
// is the sender's own trade-floor square (from their current UserFair),
// used to fill in [location] - see buildLocationText.
export const buildGeekmailMessage = (
	entry: MeetupEntry,
	settings: GeekmailSettings,
	myUsername: string,
	myLocationSquare: string | null | undefined
): GeekmailMessage => {
	const isSelling = entry.role === 'selling';
	const template = isSelling
		? settings.sellerMessageTemplate
		: settings.buyerMessageTemplate;
	const recipientToken = isSelling ? '[buyer]' : '[seller]';

	const body = template
		.split(recipientToken)
		.join(entry.counterpart)
		.split('[game]')
		.join(joinNatural(entry.items.map((item) => item.objectName)))
		.split('[amount]')
		.join(`€${entry.totalPrice}`)
		.split('[day]')
		.join(buildDayText(settings.preferredTradeDays))
		.split('[location]')
		.join(buildLocationText(entry.meetup.location, myLocationSquare))
		.split('[name]')
		.join(myUsername);

	return { to: entry.counterpart, subject: buildSubject(entry), body };
};

export const buildGeekmailUrl = (message: GeekmailMessage): string => {
	const params = [
		['touser', message.to],
		['subject', message.subject],
		['body', message.body],
	]
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&');

	return `${GEEKMAIL_COMPOSE_URL}?${params}`;
};
