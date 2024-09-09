import { Button, Stack, TextField } from '@mui/material';
import { debounce } from 'lodash';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
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

	const [ref, inView] = useInView({
		triggerOnce: false, // Allows multiple triggers
		threshold: 0.1, // Trigger when 10% of the button is visible
	});

	// Load more when the "load more" button comes into view
	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

	const hideFilters = () => {
		setSearch(undefined);
		setSearchTerm('');
		setFilters(false);
	};

	const toggleFilters = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		if (showFilters) hideFilters();
		else setFilters(true);
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
					<Stack my={2} gap={3}>
						<Stack direction="row" px={2}>
							<TextField
								fullWidth
								label="Filter"
								autoFocus={true}
								value={searchTerm}
								onChange={handleSearchChange}
							/>
						</Stack>
						<Stack direction="row" justifyContent="center">
							<Button onClick={hideFilters}>Hide filters</Button>
						</Stack>
					</Stack>
				)}

				<div
					className={
						css.items + ' ' + (isPreviousData ? css.outdated : '')
					}
				>
					<ItemsList items={items} allowBookmarks={true} />
				</div>
			</Container>

			{hasNextPage && (
				<div ref={ref} className={css.loadMore}>
					{isFetchingNextPage ? (
						<span className={css.buttonIcon}>
							<Spinner />
						</span>
					) : (
						<span>Loading more...</span>
					)}
				</div>
			)}
		</>
	);
};
