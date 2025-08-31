import classNames from 'classnames';
import { useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { LoadMore } from '../../components/LoadMore/LoadMore';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useInfiniteItems } from '../../hooks/useInfiniteItems';
import { Item } from '../../model/Item';
import { Filters } from './Filters';
import FiltersToggle from './FiltersToggle';
import css from './LatestPage.module.css';

export const LatestPage = () => {
	const {
		data,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		error,
		isLoading,
		filters,
		setFilters,
		isPreviousData,
	} = useInfiniteItems();

	// console.log({ filters });

	const [showFilters, setShowFilters] = useState(false);

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const items: Item[] = data?.pages.flatMap((page) => page.data.items) ?? [];

	const title = `Latest${filters.search ? ` '${filters.search}'` : ''}`;

	const toggleFilters = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		if (showFilters) hideFilters();
		else setShowFilters(true);
	};

	const hideFilters = () => {
		setFilters({});
		setShowFilters(false);
	};

	return (
		<>
			<TabBar />
			<Container>
				<Title
					title={title}
					left={<FiltersToggle toggleFilters={toggleFilters} />}
				/>

				{showFilters && (
					<Filters filters={filters} setFilters={setFilters} />
				)}

				<div
					className={classNames({
						[css.items]: true,
						[css.outdated]: isPreviousData,
					})}
				>
					<ItemsList
						items={items}
						allowBookmarks={true}
						allowStars={true}
					/>
				</div>
			</Container>

			{hasNextPage && (
				<LoadMore
					isLoading={isFetchingNextPage}
					hasMore={hasNextPage}
					loadMore={fetchNextPage}
				/>
			)}
		</>
	);
};
