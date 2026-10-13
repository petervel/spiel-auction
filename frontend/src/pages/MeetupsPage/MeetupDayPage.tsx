import { ExpandMoreRounded } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import {
	MeetupChanges,
	MeetupDay,
	MeetupEntry,
	useMeetups,
} from '../../hooks/useMeetups';
import { useUser } from '../../hooks/useUser';
import { TradeFloorGrid } from '../MeetupLocationPage/TradeFloorGrid';
import { CompletedSection } from './CompletedSection';
import {
	byTimeThenCounterpart,
	computeSquareCounts,
	DAY_LABELS,
	sortByCompletedAtDesc,
} from './meetupDisplay';
import { RoleGroup } from './MeetupRow';
import css from './MeetupsPage.module.css';

const VALID_DAYS = new Set<string>(Object.keys(DAY_LABELS));

const isMeetupDay = (value: string | undefined): value is MeetupDay =>
	!!value && VALID_DAYS.has(value);

const describeMeetupCount = (count: number) =>
	`${count} meetup${count === 1 ? '' : 's'}`;

// One day's slice of /meetups - its own URL so it can be linked to
// directly, with a map of where that day's still-open meetups are
// happening (counted per square, see computeSquareCounts), since that's
// only meaningful once you've narrowed down to a single day.
export const MeetupDayPage = () => {
	// The URL spells it lowercase ("/meetups/friday") - MeetupDay itself is
	// uppercase (it's the backend enum's own casing), so normalize right
	// away rather than carrying the URL's casing any further.
	const { day: dayParamRaw } = useParams<{ day: string }>();
	const dayParam = dayParamRaw?.toUpperCase();
	const { user, isLoading: userLoading } = useUser();
	const { entries, isLoading, error, updateMeetup } = useMeetups();
	const { bggUsername, verification, fetchVerification } = useBggUsername();
	const [mapOpen, setMapOpen] = useState(false);

	useEffect(() => {
		if (bggUsername) fetchVerification();
	}, [bggUsername, fetchVerification]);

	const title = isMeetupDay(dayParam) ? DAY_LABELS[dayParam] : 'Meetups';

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title={title} left={<BackButton to="/meetups" />} />
				<p>
					<LoginLink /> to see your meetups.
				</p>
			</Stack>
		);
	}

	// Same proof-of-ownership bar as the main Meetups page - see
	// MeetupsPage.tsx and requireVerifiedContext in api/meetups/index.ts.
	if (!bggUsername) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title={title} left={<BackButton to="/meetups" />} />
				<Typography>
					Set your BGG username in <Link to="/settings">Settings</Link>{' '}
					before using meetups.
				</Typography>
			</Stack>
		);
	}

	if (!verification) return <Spinner />;

	if (!verification.confirmed) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title={title} left={<BackButton to="/meetups" />} />
				<Typography>
					Verify your BGG username in <Link to="/settings">Settings</Link>{' '}
					before using meetups - this proves the person meeting up is
					actually you.
				</Typography>
			</Stack>
		);
	}

	if (!isMeetupDay(dayParam)) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title={title} left={<BackButton to="/meetups" />} />
				<Typography color="text.secondary">
					That's not a day with meetups on it.
				</Typography>
			</Stack>
		);
	}

	const onChangeFor = (entry: MeetupEntry) => (changes: MeetupChanges) =>
		updateMeetup({
			counterpartUsername: entry.counterpart,
			role: entry.role,
			...changes,
		});

	const dayEntries = entries.filter((entry) => entry.meetup.day === dayParam);
	const active = dayEntries.filter((entry) => !entry.meetup.completed);
	const completed = sortByCompletedAtDesc(
		dayEntries.filter((entry) => entry.meetup.completed),
	);
	const selling = active
		.filter((entry) => entry.role === 'selling')
		.sort(byTimeThenCounterpart);
	const buying = active
		.filter((entry) => entry.role === 'buying')
		.sort(byTimeThenCounterpart);

	// Only not-yet-completed meetups - one that's already happened no
	// longer needs a spot on the map.
	const squareCounts = computeSquareCounts(active);
	const hasMap = Object.keys(squareCounts).length > 0;

	return (
		<Stack
			sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
			paddingInline="1rem"
			paddingBottom="2rem"
			gap={3}
		>
			<Title title={title} left={<BackButton to="/meetups" />} />

			{isLoading ? (
				<Spinner />
			) : error ? (
				<Typography color="error">{error.message}</Typography>
			) : (
				<>
					{hasMap && (
						<Stack gap={1}>
							<button
								type="button"
								className={css.completedHeader}
								onClick={() => setMapOpen((prev) => !prev)}
								aria-expanded={mapOpen}
							>
								<ExpandMoreRounded
									fontSize="small"
									className={classNames(
										css.chevron,
										mapOpen && css.chevronOpen,
									)}
								/>
								<Typography variant="h6">Map</Typography>
							</button>
							{mapOpen && (
								<>
									<Typography
										variant="body2"
										color="text.secondary"
									>
										Where your not-yet-completed {title}{' '}
										meetups are happening - the number shows
										how many are at each square.
									</Typography>
									<Stack alignItems="center">
										<TradeFloorGrid
											counts={squareCounts}
											selected={null}
											onSelect={() => {}}
											readOnly
											describeCount={describeMeetupCount}
										/>
									</Stack>
								</>
							)}
						</Stack>
					)}

					{selling.length === 0 &&
					buying.length === 0 &&
					completed.length === 0 ? (
						<Typography color="text.secondary">
							No meetups scheduled for {title} yet.
						</Typography>
					) : (
						<>
							{selling.length > 0 && (
								<RoleGroup
									label="Selling"
									entries={selling}
									onChangeFor={onChangeFor}
								/>
							)}
							{buying.length > 0 && (
								<RoleGroup
									label="Buying"
									entries={buying}
									onChangeFor={onChangeFor}
								/>
							)}
							<CompletedSection
								entries={completed}
								onChangeFor={onChangeFor}
							/>
						</>
					)}
				</>
			)}
		</Stack>
	);
};
