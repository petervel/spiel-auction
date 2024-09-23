import { debounce, TextField } from '@mui/material';
import { ChangeEvent, useCallback, useState } from 'react';

type SearchFilterProps = {
	search?: string;
	setSearch: (_: string) => void;
};

export const SearchFilter = ({ search, setSearch }: SearchFilterProps) => {
	const [searchTerm, setSearchTerm] = useState(search || '');

	// Debounce the search state update (setSearch) with useCallback to avoid re-creating debounce on every render
	const debouncedSetSearch = useCallback(
		debounce((value: string) => {
			setSearch(value);
		}, 300),
		[setSearch]
	);

	const handleSearchChange = (evt: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(evt.target.value);
		debouncedSetSearch(evt.target.value);
	};

	return (
		<TextField
			fullWidth
			label="Filter"
			autoFocus={true}
			value={searchTerm}
			onChange={handleSearchChange}
		/>
	);
};
