import { Button } from '@mui/material';
import AuctionItem from '../../components/AuctionItem/AuctionItem';
import useItems from '../../hooks/useItems';
import { Item } from '../../model/Item';
import css from './LatestPage.module.css';

const Latest = () => {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
		useItems();

	const items = data?.pages.flatMap((page) => page.items) || [];

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<div>
			<ul className={css.items}>
				{items.map((item: Item) => (
					<AuctionItem key={item.id} item={item} />
				))}
			</ul>
			{hasNextPage && !isFetchingNextPage && (
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
