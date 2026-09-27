import { MenuItem, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { DEFAULT_SORT_OPTIONS, SORTING } from '../../util';

type SortButtonsProps = {
	sorting: SORTING;
	setSorting: (value: SORTING) => void;
	// Which sort values to offer, and in what order - defaults to every
	// option except OUTBID_RECENCY, which only makes sense for a group of
	// items you've actually been outbid on (see LikedPage).
	options?: SORTING[];
};

export const SortButtons = ({
	sorting,
	setSorting,
	options = DEFAULT_SORT_OPTIONS,
}: SortButtonsProps) => (
	<Stack direction="row" justifyContent="center" alignItems="center" gap={1} my={2}>
		<Typography variant="body2">Sort by</Typography>
		<Select
			size="small"
			value={sorting}
			onChange={(event: SelectChangeEvent<number>) =>
				setSorting(Number(event.target.value))
			}
		>
			{options.map((value) => (
				<MenuItem key={value} value={value}>
					{SORT_LABELS[value]}
				</MenuItem>
			))}
		</Select>
	</Stack>
);

const SORT_LABELS: Record<SORTING, string> = {
	[SORTING.MOST_RECENT]: 'Most recent',
	[SORTING.END_DATE]: 'End date',
	[SORTING.NAME]: 'Name',
	[SORTING.PRICE]: 'Price',
	[SORTING.OUTBID_RECENCY]: 'Recently outbid',
};
