import { Button } from '@mui/material';
import AuctionItem from '../../components/AuctionItem/AuctionItem';
import Spinner from '../../components/Spinner/Spinner';
import useInfiniteItems from '../../hooks/useInfiniteItems';
import { Item } from '../../model/Item';
import css from './LatestPage.module.css';

const Latest = () => {
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage, error } =
		useInfiniteItems();

	console.log({
		data,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		error,
	});
	if (!data?.pages.length && isFetchingNextPage) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<div>
			<ul className={css.items}>
				{data?.pages.map((page) => {
					return page.data.items.map((item: Item) => (
						<AuctionItem key={item.id} item={item} />
					));
				})}
			</ul>
			{hasNextPage && (
				<div className={css.loadMore}>
					<Button
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
					>
						Load more
					</Button>
				</div>
			)}
		</div>
	);
};

export default Latest;
