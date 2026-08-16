import { Item } from '../../model/Item';
import { AuctionItem } from '../AuctionItem/AuctionItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	items: Item[];
	allowBookmarks?: boolean;
	allowStars?: boolean;
	outbidItemIds?: Set<number>;
};

export const ItemsList = ({
	items,
	allowBookmarks = false,
	allowStars = false,
	outbidItemIds,
}: ItemsListProps) => {
	return (
		<ul className={css.items}>
			{items.length ? (
				items.map((item) => {
					return (
						<AuctionItem
							key={item.id}
							item={item}
							allowBookmarks={allowBookmarks}
							allowStars={allowStars}
							isOutbid={outbidItemIds?.has(item.id)}
						/>
					);
				})
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
