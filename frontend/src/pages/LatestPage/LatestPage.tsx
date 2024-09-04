import { Button } from '@mui/material';
import { Spinner } from '../../components/Spinner/Spinner';
import TabBar from '../../components/TabBar/TabBar';
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
	} = useInfiniteItems();

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const allItems: Item[] =
		data?.pages.flatMap((page) => page.data.items) ?? [];

	return (
		<>
			<TabBar />

			<ItemsPage items={allItems} />
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
