import { ExpandMoreRounded } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { MeetupChanges, MeetupEntry } from '../../hooks/useMeetups';
import { MeetupRow } from './MeetupRow';
import css from './MeetupsPage.module.css';

// Shared by the main Meetups page and a single day's page - takes entries
// already sorted (sortByCompletedAtDesc) so the two never disagree on order.
export const CompletedSection = ({
	entries,
	onChangeFor,
}: {
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
}) => {
	const [open, setOpen] = useState(false);

	if (entries.length === 0) return null;

	return (
		<Stack gap={1}>
			<button
				type="button"
				className={css.completedHeader}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
			>
				<ExpandMoreRounded
					fontSize="small"
					className={classNames(css.chevron, open && css.chevronOpen)}
				/>
				<Typography variant="h6">
					Completed ({entries.length})
				</Typography>
			</button>
			{open && (
				<div className={css.list}>
					{entries.map((entry) => (
						<MeetupRow
							key={`${entry.role}-${entry.counterpart}`}
							entry={entry}
							onChange={onChangeFor(entry)}
						/>
					))}
				</div>
			)}
		</Stack>
	);
};
