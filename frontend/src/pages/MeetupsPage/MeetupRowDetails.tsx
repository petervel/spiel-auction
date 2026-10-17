import {
	CheckRounded,
	EditRounded,
	InfoOutlined,
	MailOutlineRounded,
} from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import { MeetupEntry } from '../../hooks/useMeetups';
import { DAY_LABELS, HALL_1A } from './meetupDisplay';
import { MeetupInfoTooltip } from './MeetupInfoTooltip';
import css from './MeetupsPage.module.css';

// A positive per-side status (Geekmail sent, Prepaid) - a decorative tick,
// not an actual checkbox (that's edit mode's job), just so it reads as
// "done" at a glance rather than having to parse the words.
const StatusLine = ({ children }: { children: ReactNode }) => (
	<Stack direction="row" gap={0.5} alignItems="center">
		<CheckRounded fontSize="small" className={css.statusLabel} />
		<Typography variant="body2" className={css.statusLabel}>
			{children}
		</Typography>
	</Stack>
);

// The read-only detail a row expands to by default - editing is a separate
// step behind the Edit button here, so tapping a row to see more never
// also drops you into a form.
export const MeetupRowDetails = ({
	entry,
	onEdit,
	onSendMessage,
}: {
	entry: MeetupEntry;
	onEdit: () => void;
	onSendMessage: () => void;
}) => {
	const lastUpdatedLabel = entry.meetup.updatedAt
		? `Last updated ${new Date(entry.meetup.updatedAt).toLocaleString()}${
				entry.meetup.lastEditedBy
					? ` by ${
							entry.meetup.lastEditedBy.toLowerCase() ===
							entry.counterpart.toLowerCase()
								? entry.counterpart
								: 'you'
						}`
					: ''
			}`
		: 'Not edited yet';

	// Unlike getDisplayTime (which still hides a default 15:00 as long as
	// the location is also still Hall 1A), the expanded view always shows
	// the time once there's enough of a real plan to make it worth stating
	// - either a day's been picked, or the location's been customized.
	const showExpandedTime =
		entry.meetup.day !== null || entry.meetup.location !== HALL_1A;


	return (
		<Stack gap="1rem" className={css.details}>
			<Stack gap={0.75}>
				<Typography variant="subtitle2" color="text.secondary">
					Shared information
				</Typography>
				{/* Additive, not a replacement - a pure custom meetup (no
				items) already shows its description as the "game name" in
				the collapsed row, so it's only repeated here when there's
				also a real item. */}
				{entry.items.length > 0 && entry.meetup.customDescription && (
					<Typography variant="body2" color="text.secondary">
						{entry.meetup.customDescription}
					</Typography>
				)}
				{entry.items.length > 1 && (
					<Stack gap={0.25}>
						{entry.items.map((item) => (
							<Stack
								key={item.id}
								direction="row"
								gap={1}
								alignItems="center"
							>
								<span
									className={classNames(css.price, css.itemPrice)}
								>
									€{item.currentBid ?? 0}
								</span>
								<Typography variant="body2" color="text.secondary">
									{item.objectName}
								</Typography>
							</Stack>
						))}
					</Stack>
				)}
				<Stack gap={0.5}>
					<Stack
						direction="row"
						gap={1}
						justifyContent="space-between"
						alignItems="center"
					>
						<Typography
							variant="body2"
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 0.75,
								flexWrap: 'wrap',
							}}
						>
							<span>
								{entry.meetup.day
									? DAY_LABELS[entry.meetup.day]
									: 'Day not set'}
								{showExpandedTime && ` · ${entry.meetup.time}`}
								{' · '}
								{entry.meetup.location === HALL_1A
									? HALL_1A
									: entry.meetup.location}
							</span>
							{entry.meetup.location === HALL_1A &&
								entry.counterpartLocation?.square && (
									<span className={css.coordinateChip}>
										{entry.counterpartLocation.square}
									</span>
								)}
						</Typography>
						<MeetupInfoTooltip
							label={lastUpdatedLabel}
							sx={{ flexShrink: 0 }}
						/>
					</Stack>
					{entry.meetup.location === HALL_1A &&
						entry.counterpartLocation?.description && (
							<Typography
								variant="body2"
								className={css.counterpartInfo}
							>
								<InfoOutlined
									fontSize="small"
									className={css.counterpartInfoIcon}
								/>
								{entry.counterpartLocation.description}
							</Typography>
						)}
				</Stack>
			</Stack>
			<Stack gap={0.75}>
				<Typography variant="subtitle2" color="text.secondary">
					Private/personal information
				</Typography>
				{entry.meetup.messageSent ? (
					<StatusLine>Geekmail sent</StatusLine>
				) : (
					<Typography variant="body2" color="text.secondary">
						Geekmail not sent yet
					</Typography>
				)}
				{entry.meetup.prepaid && <StatusLine>Prepaid</StatusLine>}
				{entry.meetup.myNotes && (
					<fieldset className={css.myNotes}>
						<legend className={css.myNotesLabel}>
							My notes
						</legend>
						<Typography variant="body2" color="text.secondary">
							{entry.meetup.myNotes}
						</Typography>
					</fieldset>
				)}
			</Stack>
			<Stack
				direction="row"
				gap={1}
				alignItems="center"
				justifyContent="space-between"
			>
				<Button
					size="small"
					startIcon={<EditRounded fontSize="small" />}
					onClick={onEdit}
				>
					Edit
				</Button>
				<Button
					size="small"
					startIcon={<MailOutlineRounded fontSize="small" />}
					onClick={onSendMessage}
				>
					Send message
				</Button>
			</Stack>
		</Stack>
	);
};
