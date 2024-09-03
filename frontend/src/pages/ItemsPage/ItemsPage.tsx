import { Button } from '@mui/material';
import AuctionItem from '../../components/AuctionItem/AuctionItem';
import Spinner from '../../components/Spinner/Spinner';
import useInfiniteItems from '../../hooks/useInfiniteItems';
import { Item } from '../../model/Item';
import css from './ItemsPage.module.css';

export const ItemsPage = (queryData = {}) => {
	const {
		data,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		error,
		isLoading,
	} = useInfiniteItems(queryData);

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const totalItems = data?.pages.reduce(
		(total, page) => (total += page.data.items.length),
		0
	);

	return (
		<div>
			<ul className={css.items}>
				{totalItems ? (
					data?.pages.map((page) => {
						return page.data.items.map((item: Item) => (
							<AuctionItem key={item.id} item={item} />
						));
					})
				) : (
					<>No items found.</>
				)}
			</ul>
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
		</div>
	);
};
