import {
	AccessTimeRounded,
	CheckRounded,
	ExpandMoreRounded,
	HandshakeRounded,
	PlaceRounded,
} from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useListId } from '../../hooks/useListId';
import { MeetupChanges, MeetupEntry, useMeetups } from '../../hooks/useMeetups';
import { useUser } from '../../hooks/useUser';
import { AddCustomMeetupDialog } from './AddCustomMeetupDialog';
import { MeetupRowDetails } from './MeetupRowDetails';
import { MeetupRowEditForm } from './MeetupRowEditForm';
import { MessageComposeDialog } from './MessageComposeDialog';
import {
	DAY_LABELS,
	DAY_ORDER,
	getDisplayLocation,
	getDisplayTime,
} from './meetupDisplay';
import css from './MeetupsPage.module.css';
import { exportMeetupsToXlsx } from './xlsxExport';

const gameNamesOf = (entry: MeetupEntry) =>
	entry.items.map((item) => item.objectName).join(', ');

const byTimeThenCounterpart = (a: MeetupEntry, b: MeetupEntry) => {
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
const byGameName = (a: MeetupEntry, b: MeetupEntry) =>
	gameNamesOf(a).localeCompare(gameNamesOf(b));

type DaySection = {
	key: string;
	label: string;
	selling: MeetupEntry[];
	buying: MeetupEntry[];
};

const makeSection = (
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
const groupByDay = (entries: MeetupEntry[]): DaySection[] => {
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

export const MeetupsPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const listId = useListId();
	const { entries, isLoading, error, updateMeetup, addCustomMeetup } =
		useMeetups();
	const [completedOpen, setCompletedOpen] = useState(false);
	const [addingCustom, setAddingCustom] = useState(false);
	const { bggUsername, verification, fetchVerification } = useBggUsername();

	useEffect(() => {
		if (bggUsername) fetchVerification();
	}, [bggUsername, fetchVerification]);

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title="Meetups" left={<BackButton />} />
				<p>
					<LoginLink /> to see your meetups.
				</p>
			</Stack>
		);
	}

	// Same proof-of-ownership bar the backend enforces (requireVerifiedContext
	// in api/meetups/index.ts) - shown as its own states here instead of just
	// surfacing that route's 403 as plain error text.
	if (!bggUsername) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title="Meetups" left={<BackButton />} />
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
				<Title title="Meetups" left={<BackButton />} />
				<Typography>
					Verify your BGG username in <Link to="/settings">Settings</Link>{' '}
					before using meetups - this proves the person meeting up is
					actually you.
				</Typography>
			</Stack>
		);
	}

	const active = entries.filter((entry) => !entry.meetup.completed);
	const completed = [
		...entries.filter((entry) => entry.meetup.completed),
	].sort((a, b) => {
		const aTime = a.meetup.completedAt
			? new Date(a.meetup.completedAt).getTime()
			: 0;
		const bTime = b.meetup.completedAt
			? new Date(b.meetup.completedAt).getTime()
			: 0;
		return bTime - aTime;
	});
	const daySections = groupByDay(active);

	const onChangeFor = (entry: MeetupEntry) => (changes: MeetupChanges) =>
		updateMeetup({
			counterpartUsername: entry.counterpart,
			role: entry.role,
			...changes,
		});

	return (
		<>
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
				gap={3}
			>
				<Title
					title="Meetups"
					left={<BackButton />}
					right={
						<Button
							variant="contained"
							size="small"
							disabled={entries.length === 0}
							onClick={() => exportMeetupsToXlsx(entries, listId)}
						>
							Export
						</Button>
					}
				/>

				{isLoading ? (
					<Spinner />
				) : error ? (
					<Typography color="error">{error.message}</Typography>
				) : (
					<>
						{entries.length === 0 ? (
							<Typography color="text.secondary">
								No meetups yet - these show up once you're
								winning (or have won) an item, or you've sold
								(or are selling) one with at least one bid.
							</Typography>
						) : (
							<>
								{daySections.map((section) => (
									<Stack key={section.key} gap={1.5}>
										<Typography variant="h6">
											{section.label}
										</Typography>
										{section.selling.length > 0 && (
											<RoleGroup
												label="Selling"
												entries={section.selling}
												onChangeFor={onChangeFor}
											/>
										)}
										{section.buying.length > 0 && (
											<RoleGroup
												label="Buying"
												entries={section.buying}
												onChangeFor={onChangeFor}
											/>
										)}
									</Stack>
								))}

								{completed.length > 0 && (
									<Stack gap={1}>
										<button
											type="button"
											className={css.completedHeader}
											onClick={() =>
												setCompletedOpen(
													(open) => !open,
												)
											}
											aria-expanded={completedOpen}
										>
											<ExpandMoreRounded
												fontSize="small"
												className={classNames(
													css.chevron,
													completedOpen &&
														css.chevronOpen,
												)}
											/>
											<Typography variant="h6">
												Completed ({completed.length})
											</Typography>
										</button>
										{completedOpen && (
											<div className={css.list}>
												{completed.map((entry) => (
													<MeetupRow
														key={`${entry.role}-${entry.counterpart}`}
														entry={entry}
														onChange={onChangeFor(
															entry,
														)}
													/>
												))}
											</div>
										)}
									</Stack>
								)}
							</>
						)}

						<Button
							variant="contained"
							onClick={() => setAddingCustom(true)}
							sx={{ alignSelf: 'center' }}
						>
							Add custom meetup
						</Button>
					</>
				)}
			</Stack>
			<AddCustomMeetupDialog
				open={addingCustom}
				onClose={() => setAddingCustom(false)}
				onAdd={addCustomMeetup}
			/>
		</>
	);
};

const RoleGroup = ({
	label,
	entries,
	onChangeFor,
}: {
	label: string;
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
}) => (
	<Stack gap={0.75}>
		<Typography variant="subtitle2" color="text.secondary">
			{label}
		</Typography>
		<div className={css.list}>
			{entries.map((entry) => (
				<MeetupRow
					key={`${entry.role}-${entry.counterpart}`}
					entry={entry}
					onChange={onChangeFor(entry)}
				/>
			))}
		</div>
	</Stack>
);

const MeetupRow = ({
	entry,
	onChange,
}: {
	entry: MeetupEntry;
	onChange: (changes: MeetupChanges) => void;
}) => {
	// Collapsed by default. Expanding just reveals the full read-only detail -
	// editing is a separate step behind its own icon, so tapping a row to
	// see more never also drops you into a form. The view and the edit form
	// are their own components (MeetupRowDetails/MeetupRowEditForm) - this
	// component just owns the expand/edit/complete state and picks which
	// one to render.
	const [expanded, setExpanded] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isMessaging, setIsMessaging] = useState(false);

	// Ticking the checkbox jumps this row to a different section (Completed,
	// or back out of it) - committing that instantly made it feel like the
	// row just vanished before you saw it get checked. So the tick is shown
	// right away, the row collapses vertically in place (height -> 0, not a
	// horizontal slide - that read as the row flying off rather than tidying
	// itself away), and only once that finishes do we tell the server and
	// let the row actually leave this list.
	const [optimisticCompleted, setOptimisticCompleted] = useState<
		boolean | null
	>(null);
	const [leaving, setLeaving] = useState(false);
	const [collapseHeight, setCollapseHeight] = useState<number | undefined>(
		undefined,
	);
	const rowRef = useRef<HTMLDivElement>(null);
	const leaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => () => clearTimeout(leaveTimeout.current), []);

	const toggleCompleted = () => {
		if (leaving) return;
		const next = !entry.meetup.completed;
		setOptimisticCompleted(next);
		// Fix the row's current height as an explicit inline style first (so
		// nothing jumps), then flip to 0 on the next frame so the height
		// change from a real pixel value - not "auto" - is what animates.
		setCollapseHeight(rowRef.current?.offsetHeight);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => setLeaving(true));
		});
		leaveTimeout.current = setTimeout(() => {
			onChange({ completed: next });
		}, 280);
	};

	const displayCompleted = optimisticCompleted ?? entry.meetup.completed;

	const toggleExpanded = () => {
		if (expanded) {
			setExpanded(false);
			setIsEditing(false);
		} else {
			setExpanded(true);
		}
	};

	// A pure custom meetup (see POST /api/meetups/custom) has no items to
	// name - its description stands in for the game name here instead.
	const gameNames =
		entry.items.length > 0
			? gameNamesOf(entry)
			: entry.meetup.customDescription ?? '';

	return (
		<div
			className={classNames(css.rowOuter, leaving && css.collapsed)}
			style={
				collapseHeight !== undefined
					? { height: leaving ? 0 : collapseHeight }
					: undefined
			}
		>
			<div
				ref={rowRef}
				className={classNames(
					css.row,
					entry.role === 'buying' ? css.buying : css.selling,
					leaving && css.fadingOut,
				)}
			>
				<div className={css.collapsedLine}>
					<button
						type="button"
						className={css.expandButton}
						onClick={toggleExpanded}
						aria-expanded={expanded}
					>
						{entry.items.length > 0 ? (
							<span className={css.price}>€{entry.totalPrice}</span>
						) : (
							<span className={css.price}>
								<HandshakeRounded fontSize="small" />
							</span>
						)}
						<span className={css.main}>
							<span className={css.game}>{gameNames}</span>
							<span className={css.counterpart}>
								{entry.counterpart}
							</span>
						</span>
						<span className={css.side}>
							{getDisplayTime(entry) && (
								<span className={css.time}>
									{getDisplayTime(entry)}
									<AccessTimeRounded sx={{ fontSize: 14 }} />
								</span>
							)}
							{getDisplayLocation(entry) && (
								<span className={css.location}>
									<span className={css.locationText}>
										{getDisplayLocation(entry)}
									</span>
									<PlaceRounded sx={{ fontSize: 14 }} />
								</span>
							)}
						</span>
					</button>
					<button
						type="button"
						role="checkbox"
						aria-checked={displayCompleted}
						aria-label="Mark completed"
						disabled={leaving}
						className={classNames(
							css.checkbox,
							displayCompleted && css.checkboxChecked,
						)}
						onClick={toggleCompleted}
					>
						{displayCompleted && (
							<CheckRounded
								fontSize="small"
								className={css.checkIcon}
							/>
						)}
					</button>
				</div>

				{expanded && !isEditing && (
					<MeetupRowDetails
						entry={entry}
						onEdit={() => setIsEditing(true)}
						onSendMessage={() => setIsMessaging(true)}
					/>
				)}

				{expanded && isEditing && (
					<MeetupRowEditForm
						entry={entry}
						onSave={(changes) => {
							onChange(changes);
							setIsEditing(false);
						}}
					/>
				)}
			</div>
			<MessageComposeDialog
				entry={entry}
				open={isMessaging}
				onClose={() => setIsMessaging(false)}
			/>
		</div>
	);
};
