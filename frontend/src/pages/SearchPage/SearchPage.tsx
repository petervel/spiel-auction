import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { LoadMore } from '../../components/LoadMore/LoadMore';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { BggObject, useInfiniteObjects } from '../../hooks/useInfiniteObjects';
import SearchResults from './SearchResults';

export const SearchPage = () => {
	const [searchParams] = useSearchParams();
	const searchTerm = searchParams.get('search') ?? undefined;

	const {
		data,
		error,
		isLoading,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
		filters,
		setFilters,
	} = useInfiniteObjects(searchTerm);

	useEffect(() => {
		if (searchTerm !== filters.search) {
			setFilters((filters) => ({ ...filters, search: searchTerm }));
		}
	}, [searchTerm, filters, setFilters]);

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!data) {
		return <div>Error: failed to load data.</div>;
	}

	const objects: BggObject[] =
		data?.pages.flatMap((page) => page.objects) ?? [];

	const title =
		objects.length > 0 ? `Results for "${filters.search}"` : 'Search';

	return (
		<>
			<Container>
				<Title title={title} />
				<SearchResults data={objects} search={filters.search} />
				{hasNextPage && (
					<LoadMore
						isLoading={isFetchingNextPage}
						hasMore={hasNextPage ?? false}
						loadMore={fetchNextPage}
					/>
				)}
			</Container>
		</>
	);
};
