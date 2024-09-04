import AuctionItem from '../../components/AuctionItem/AuctionItem';
import { Item } from '../../model/Item';
import css from './ItemsPage.module.css';

type ItemsPageProps = {
	items: Item[];
};
export const ItemsPage = ({ items }: ItemsPageProps) => {
	console.log({ items });
	return (
		<ul className={css.items}>
			{items.length ? (
				items.map((item) => <AuctionItem key={item.id} item={item} />)
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
