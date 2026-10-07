import { Stack, Typography } from '@mui/material';
import css from './MeetupSpotSummary.module.css';

// Shared between the Meetup Location page (where it's set) and the
// Settings page (where it's just shown) - one look for "what my meetup
// info currently is" everywhere it appears.
export const MeetupSpotSummary = ({
	square,
	description,
}: {
	square: string | null;
	description: string | null;
}) => {
	if (!square && !description) {
		return (
			<div className={css.summaryEmptyCard}>
				<div className={css.summaryEmptyBadge}>?</div>
				<Typography variant="body2" color="text.secondary">
					No spot or description yet.
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
					{square ? 'Your spot · Hall 1A' : 'No spot picked yet'}
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
