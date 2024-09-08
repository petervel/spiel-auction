import { Input, Stack } from '@mui/material';
import classNames from 'classnames';
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
				search,
			}).toString(),
		});
	};

	return (
		<Stack flex={1} direction="row">
			{
				<Input
					autoFocus={true}
					className={classNames({
						[css.searchBox]: true,
					})}
					value={search}
					onChange={(event) => setSearch(event.target.value.trim())}
					onKeyUp={(event) => {
						if (event.key === 'Enter') {
							handleSearch();
						}
					}}
				/>
			}
		</Stack>
	);
};

export default SearchField;
