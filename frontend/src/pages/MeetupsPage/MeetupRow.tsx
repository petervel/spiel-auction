import {
	AccessTimeRounded,
	CheckRounded,
	HandshakeRounded,
	PlaceRounded,
} from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
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
}: {
	label: string;
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
	onRenameFor: (entry: MeetupEntry) => (input: RenameInput) => Promise<unknown>;
	onDeleteFor: (entry: MeetupEntry) => () => Promise<unknown>;
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
					onRename={onRenameFor(entry)}
					onDelete={onDeleteFor(entry)}
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
}: {
	entry: MeetupEntry;
	onChange: (changes: MeetupChanges) => void;
	onRename: (input: RenameInput) => Promise<unknown>;
	onDelete: () => Promise<unknown>;
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
