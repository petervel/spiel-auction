import { Stack, Typography } from '@mui/material';
import css from './MeetupSpotSummary.module.css';

// Shared between the Meetup Location page (where it's set), the Settings
// page (where it's just shown), and the location lookup (where it's
// someone else's) - one look for "what a meetup spot is" everywhere it
// appears. label/emptyLabel default to the "my own spot" wording.
export const MeetupSpotSummary = ({
	square,
	description,
	label = 'Your spot · Hall 1A',
	emptyLabel = 'No spot or description yet.',
}: {
	square: string | null;
	description: string | null;
	label?: string;
	emptyLabel?: string;
}) => {
	if (!square && !description) {
		return (
			<div className={css.summaryEmptyCard}>
				<div className={css.summaryEmptyBadge}>?</div>
				<Typography variant="body2" color="text.secondary">
					{emptyLabel}
				</Typography>
			</div>
		);
	}

	return (
		<div className={css.summaryCard}>
			<div className={square ? css.summaryBadge : css.summaryEmptyBadge}>
				{square ?? '?'}
			</div>
			<Stack gap={0.25} minWidth={0}>
				<Typography variant="subtitle2" fontWeight={700}>
					{square ? label : 'No spot picked yet'}
				</Typography>
				{description && (
					<Typography variant="body2" color="text.secondary" noWrap>
						&quot;{description}&quot;
					</Typography>
				)}
			</Stack>
		</div>
	);
};
