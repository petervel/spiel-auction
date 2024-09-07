import { Button, Input } from '@mui/material';
import { debounce } from 'lodash';
import { ChangeEvent, useCallback, useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useInfiniteItems } from '../../hooks/useInfiniteItems';
import { Item } from '../../model/Item';
import FiltersToggle from './FiltersToggle';
import css from './LatestPage.module.css';

export const LatestPage = () => {
	const queryInfo = useInfiniteItems();

	const {
		data,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		error,
		isLoading,
		search,
		setSearch,
		isPreviousData,
	} = queryInfo;

	const [showFilters, setFilters] = useState(false);
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

	const toggleFilters = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		setFilters((isActive) => {
			if (isActive) {
				setSearch(undefined);
				setSearchTerm('');
			}
			return !isActive;
		});
	};

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const items: Item[] = data?.pages.flatMap((page) => page.data.items) ?? [];

	const title = `Latest${search ? ` '${search}'` : ''}`;

	return (
		<>
			<TabBar />
			<Container>
				<Title
					title={title}
					left={<FiltersToggle toggleFilters={toggleFilters} />}
				/>

				{showFilters && (
					<Input
						autoFocus={true}
						className={css.searchBox}
						value={searchTerm}
						onChange={handleSearchChange}
					/>
				)}

				<div
					className={
						css.items + ' ' + (isPreviousData ? css.outdated : '')
					}
				>
					<ItemsList items={items} />
				</div>
			</Container>

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
