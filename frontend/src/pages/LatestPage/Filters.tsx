import { Stack } from '@mui/material';
import { Dispatch } from 'react';
import { SearchFilters } from '../../hooks/useInfiniteItems';
import { SearchFilter } from './SearchFilter';

type FiltersProps = {
	filters: SearchFilters;
	setFilters: Dispatch<React.SetStateAction<SearchFilters>>;
};
export const Filters = ({ filters, setFilters }: FiltersProps) => {
	const search = filters.search ?? '';

	const setSearch = (value: string) => {
		setFilters((f: SearchFilters) => ({ ...f, search: value }));
	};

	return (
		<Stack my={2} gap={3}>
			<Stack direction="row" px={2}>
				<SearchFilter search={search} setSearch={setSearch} />
			</Stack>
		</Stack>
	);
};
