import { Item } from '../../model/Item';
import { AuctionItem } from '../AuctionItem/AuctionItem';
import { ItemDisplayOptions } from '../AuctionItem/ItemDisplayOptions';
import css from './ItemsList.module.css';

type ItemsListProps = {
	items: Item[];
	// Which of `items` are currently outbid - only meaningful together with
	// options.silentToggle, to pick the broken-heart icon for those items.
	outbidItemIds?: Set<number>;
	options?: ItemDisplayOptions;
};

export const ItemsList = ({ items, outbidItemIds, options }: ItemsListProps) => {
	return (
		<ul className={css.items}>
			{items.length ? (
				items.map((item) => {
					return (
						<AuctionItem
							key={item.id}
							item={item}
							isOutbid={outbidItemIds?.has(item.id) ?? false}
							options={options}
						/>
					);
				})
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
