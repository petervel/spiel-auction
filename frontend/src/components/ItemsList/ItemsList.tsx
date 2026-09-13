import { Item } from '../../model/Item';
import { AuctionItem } from '../AuctionItem/AuctionItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	items: Item[];
	allowBookmarks?: boolean;
	allowLikes?: boolean;
	silentToggle?: boolean;
	outbidItemIds?: Set<number>;
	startExpanded?: boolean;
	allowObjectActions?: boolean;
};

export const ItemsList = ({
	items,
	allowBookmarks = false,
	allowLikes = false,
	silentToggle = false,
	outbidItemIds,
	startExpanded = false,
	allowObjectActions = true,
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
							isOutbid={outbidItemIds?.has(item.id) ?? false}
							startExpanded={startExpanded}
							allowObjectActions={allowObjectActions}
						/>
					);
				})
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
