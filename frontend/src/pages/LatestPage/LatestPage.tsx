import { Button, Input } from '@mui/material';
import { debounce } from 'lodash';
import { ChangeEvent, useEffect, useState } from 'react';
import { Spinner } from '../../components/Spinner/Spinner';
import useInfiniteItems from '../../hooks/useInfiniteItems';
import { Item } from '../../model/Item';
import { ItemsPage } from '../ItemsPage/ItemsPage';
import css from './LatestPage.module.css';

export const LatestPage = () => {
	const {
		data,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		error,
		isLoading,
		search,
		setSearch,
	} = useInfiniteItems();

	const [showFilters, setFilters] = useState(false);
	const [searchTerm, setSearchTerm] = useState(search || '');

	useEffect(() => {
		// Debounced search setter
		const debouncedSetSearch = debounce((value: string) => {
			setSearch(value);
		}, 300);

		// Trigger debounce when searchTerm changes
		debouncedSetSearch(searchTerm);

		// Clean up debounce on unmount or before rerunning
		return () => {
			debouncedSetSearch.cancel();
		};
	}, [searchTerm, setSearch]);

	const handleSearchChange = (evt: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(evt.target.value);
	};

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const allItems: Item[] =
		data?.pages.flatMap((page) => page.data.items) ?? [];

	const title = `Latest${search ? ` '${search}'` : ''}`;

	return (
		<>
			<Button onClick={() => setFilters((v) => !v)}>Filters</Button>

			{showFilters && (
				<Input value={searchTerm} onChange={handleSearchChange} />
			)}
			<ItemsPage title={title} items={allItems} />
			{hasNextPage && (
				<div className={css.loadMore}>
					<Button
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
					>
						{isFetchingNextPage ? (
							<span className={css.buttonIcon}>
								<Spinner />
							</span>
						) : (
							'Load more'
						)}
					</Button>
				</div>
			)}
		</>
	);
};
