import { Input } from '@mui/material';
import { useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import css from './SearchField.module.css';

const SearchField = () => {
	const [search, setSearch] = useState('');

	const navigate = useNavigate();
	const handleSearch = () => {
		if (search.length === 0) return;

		navigate({
			pathname: '/search',
			search: createSearchParams({
				search: search.trim(),
			}).toString(),
		});
	};

	return (
		<Input
			autoFocus={true}
			className={css.searchBox}
			value={search}
			onChange={(event) => setSearch(event.target.value)}
			onKeyUp={(event) => {
				if (event.key === 'Enter') {
					handleSearch();
				}
			}}
		/>
	);
};

export default SearchField;
