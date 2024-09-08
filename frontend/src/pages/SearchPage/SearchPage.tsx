import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useObjects } from '../../hooks/useObjects';
import SearchResults from './SearchResults';

export const SearchPage = () => {
	const [searchParams] = useSearchParams();
	const searchTerm = searchParams.get('search') ?? undefined;

	const { data, error, isLoading, search, setSearch } =
		useObjects(searchTerm);

	useEffect(() => {
		if (searchTerm !== search) {
			setSearch(searchTerm);
		}
	}, [searchTerm, search, setSearch]);

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
				<SearchResults data={data} search={search} />
			</Container>
		</>
	);
};
