import { EditRounded, InfoOutlined } from '@mui/icons-material';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import classNames from 'classnames';
import { MeetupEntry } from '../../hooks/useMeetups';
import { DAY_LABELS, HALL_1A } from './meetupDisplay';
import css from './MeetupsPage.module.css';

// The read-only detail a row expands to by default - editing is a separate
// step behind the Edit button here, so tapping a row to see more never
// also drops you into a form.
export const MeetupRowDetails = ({
	entry,
	onEdit,
}: {
	entry: MeetupEntry;
	onEdit: () => void;
}) => {
	const lastUpdatedLabel = entry.meetup.updatedAt
		? `Last updated ${new Date(entry.meetup.updatedAt).toLocaleString()}`
		: 'Not edited yet';

	// Unlike getDisplayTime (which still hides a default 15:00 as long as
	// the location is also still Hall 1A), the expanded view always shows
	// the time once there's enough of a real plan to make it worth stating
	// - either a day's been picked, or the location's been customized.
	const showExpandedTime =
		entry.meetup.day !== null || entry.meetup.location !== HALL_1A;

	return (
		<Stack gap="1rem" className={css.details}>
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
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				gap={1}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', sm: 'center' }}
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
			{entry.meetup.myNotes && (
				<fieldset className={css.myNotes}>
					<legend className={css.myNotesLabel}>My notes</legend>
					<Typography variant="body2" color="text.secondary">
						{entry.meetup.myNotes}
					</Typography>
				</fieldset>
			)}
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
				<Tooltip title={lastUpdatedLabel}>
					<IconButton size="small" aria-label={lastUpdatedLabel}>
						<InfoOutlined fontSize="small" />
					</IconButton>
				</Tooltip>
			</Stack>
		</Stack>
	);
};
