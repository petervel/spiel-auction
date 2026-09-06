import { Item } from '../../model/Item';
import { AuctionItem } from '../AuctionItem/AuctionItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	items: Item[];
	allowBookmarks?: boolean;
	allowLikes?: boolean;
	silentToggle?: boolean;
	isOutbid?: boolean;
};

export const ItemsList = ({
	items,
	allowBookmarks = false,
	allowLikes = false,
	silentToggle = false,
	isOutbid = false,
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
							allowLikes={allowLikes}
							silentToggle={silentToggle}
							isOutbid={isOutbid}
						/>
					);
				})
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
