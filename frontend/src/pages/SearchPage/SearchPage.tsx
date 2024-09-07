import { Search } from '@mui/icons-material';
import { IconButton, Input, InputAdornment } from '@mui/material';
import { useState } from 'react';
import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useObjects } from '../../hooks/useObjects';
import css from './SearchPage.module.css';
import SearchResults from './SearchResults';

export const SearchPage = () => {
	const { data, error, isLoading, search, setSearch } = useObjects();

	const [searchTerm, setSearchTerm] = useState(search);

	const handleSearch = () => {
		setSearch(searchTerm?.trim() ?? '');
	};

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value); // Update the search state
	};

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!data) {
		return <div>Error: failed to load data.</div>;
	}

	const title =
		data.length === 100
			? `Best 100 results for "${search}"`
			: data.length > 0
			? `Results for "${search}"`
			: 'Search';

	return (
		<>
			<TabBar />
			<Container>
				<Title title={title} />
				<Input
					autoFocus={true}
					className={css.searchBox}
					value={searchTerm}
					onChange={handleSearchChange}
					onKeyUp={(event) => {
						if (event.key === 'Enter') {
							handleSearch();
						}
					}}
					endAdornment={
						<InputAdornment position="end">
							<IconButton onClick={handleSearch}>
								<Search />
							</IconButton>
						</InputAdornment>
					}
				/>
				<SearchResults data={data} search={search} />
			</Container>
		</>
	);
};
