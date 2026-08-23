import { MenuItem, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { SORTING } from '../../util';

type SortButtonsProps = {
	sorting: SORTING;
	setSorting: (value: SORTING) => void;
};

export const SortButtons = ({ sorting, setSorting }: SortButtonsProps) => (
	<Stack direction="row" justifyContent="center" alignItems="center" gap={1} my={2}>
		<Typography variant="body2">Sort by</Typography>
		<Select
			size="small"
			value={sorting}
			onChange={(event: SelectChangeEvent<number>) =>
				setSorting(Number(event.target.value))
			}
		>
			{SORT_OPTIONS.map((option) => (
				<MenuItem key={option.value} value={option.value}>
					{option.label}
				</MenuItem>
			))}
		</Select>
	</Stack>
);

const SORT_OPTIONS = [
	{ value: SORTING.MOST_RECENT, label: 'Most recent' },
	{ value: SORTING.END_DATE, label: 'End date' },
	{ value: SORTING.NAME, label: 'Name' },
	{ value: SORTING.PRICE, label: 'Price' },
];
