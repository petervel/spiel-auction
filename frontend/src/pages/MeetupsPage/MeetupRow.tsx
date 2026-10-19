import {
	AccessTimeRounded,
	CheckRounded,
	HandshakeRounded,
	PlaceRounded,
} from '@mui/icons-material';
import { Stack, Tooltip, Typography } from '@mui/material';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import {
	MeetupChanges,
	MeetupEntry,
	RenameCustomMeetupInput,
} from '../../hooks/useMeetups';
import {
	gameNamesOf,
	getDisplayLocation,
	getDisplayTime,
	meetupKey,
} from './meetupDisplay';
import { MeetupRowDetails } from './MeetupRowDetails';
import { MeetupRowEditForm } from './MeetupRowEditForm';
import css from './MeetupsPage.module.css';
import { MessageComposeDialog } from './MessageComposeDialog';

// Shared by the main Meetups page and a single day's page, so a row looks
// and behaves identically wherever it's shown.
export type RenameInput = Omit<
	RenameCustomMeetupInput,
	'counterpartUsername' | 'role'
>;

export const RoleGroup = ({
	label,
	entries,
	onChangeFor,
	onRenameFor,
	onDeleteFor,
	highlightedKey,
	onHighlighted,
}: {
	label: string;
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
	onRenameFor: (entry: MeetupEntry) => (input: RenameInput) => Promise<unknown>;
	onDeleteFor: (entry: MeetupEntry) => () => Promise<unknown>;
	// The meetup (see meetupKey) a just-added custom meetup landed on, if
	// any - scrolled to, expanded and briefly flashed once its row mounts.
	highlightedKey?: string | null;
	onHighlighted?: () => void;
}) => (
	<Stack gap={0.75}>
		<Typography variant="subtitle2" color="text.secondary">
			{label}
		</Typography>
		<div className={css.list}>
			{entries.map((entry) => (
				<MeetupRow
					key={meetupKey(entry)}
					entry={entry}
					onChange={onChangeFor(entry)}
					onRename={onRenameFor(entry)}
					onDelete={onDeleteFor(entry)}
					highlighted={meetupKey(entry) === highlightedKey}
					onHighlighted={onHighlighted}
				/>
			))}
		</div>
	</Stack>
);

export const MeetupRow = ({
	entry,
	onChange,
	onRename,
	onDelete,
	highlighted = false,
	onHighlighted,
}: {
	entry: MeetupEntry;
	onChange: (changes: MeetupChanges) => void;
	onRename: (input: RenameInput) => Promise<unknown>;
	onDelete: () => Promise<unknown>;
	highlighted?: boolean;
	onHighlighted?: () => void;
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

	// Expands (and keeps expanded, even after the flash below fades) the
	// moment `highlighted` first turns true - a just-added/merged custom
	// meetup (see MeetupsPage's handleAddCustom) is otherwise invisible,
	// possibly collapsed inside "Unfinished"/"Completed" or scrolled
	// off-screen. React's documented "adjust state during render" pattern
	// (comparing against the previous prop value) rather than an effect -
	// it applies before this render paints, so there's no flash-of-
	// collapsed-then-expanded, and no setState-in-effect lint violation.
	const [prevHighlighted, setPrevHighlighted] = useState(highlighted);
	if (highlighted !== prevHighlighted) {
		setPrevHighlighted(highlighted);
		if (highlighted) setExpanded(true);
	}

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

	// Scrolls the row into view and, once the flash (driven directly off
	// `highlighted` below, no local state needed for it) has had time to
	// register, tells the parent to let go of the highlight.
	useEffect(() => {
		if (!highlighted) return;
		const raf = requestAnimationFrame(() =>
			rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
		);
		const timeout = setTimeout(() => onHighlighted?.(), 2200);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timeout);
		};
		// Only the highlighted->true transition should re-run this - not
		// onHighlighted re-identifying on every parent render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [highlighted]);

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

	// The addendum case: a custom meetup added on top of a genuine
	// buying/selling pair (POST /api/meetups/custom merging onto an
	// existing row) - otherwise invisible in the collapsed line, since
	// gameNames above only ever shows the real item names here.
	const hasCustomNoteAddendum =
		entry.items.length > 0 && !!entry.meetup.customDescription;

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
					highlighted && css.justAdded,
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
							<span
								className={classNames(
									css.price,
									entry.meetup.prepaid && css.prepaid,
								)}
							>
								€{entry.totalPrice}
							</span>
						) : (
							<span className={css.price}>
								<HandshakeRounded fontSize="small" />
							</span>
						)}
						<span className={css.main}>
							<span className={css.game}>
								<span className={css.gameName}>{gameNames}</span>
								{hasCustomNoteAddendum && (
									<Tooltip title="Also has a custom note - see below">
										<HandshakeRounded
											fontSize="inherit"
											className={css.customNoteBadge}
										/>
									</Tooltip>
								)}
							</span>
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

				{expanded && <hr className={css.rowDivider} />}

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
						onRename={async (input) => {
							await onRename(input);
							setIsEditing(false);
						}}
						onCancel={() => setIsEditing(false)}
						onDelete={onDelete}
					/>
				)}
			</div>
			<MessageComposeDialog
				entry={entry}
				open={isMessaging}
				onClose={() => setIsMessaging(false)}
				onChange={onChange}
			/>
		</div>
	);
};
