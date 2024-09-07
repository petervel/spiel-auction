import { useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { Item } from '../../model/Item';
import { AuctionItem } from '../AuctionItem/AuctionItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	items: Item[];
};

export const ItemsList = ({ items }: ItemsListProps) => {
	const [bookmark, setBookmark, clearBookmark] =
		useLocalStorage<number>('bookmark');

	const [bookmarkNumber, setBookmarkNumber] = useState<number>(
		Number.isNaN(+bookmark) ? 0 : +bookmark
	);

	const updateBookmark = (id: number) => {
		if (bookmarkNumber !== id) {
			setBookmark(id);
			setBookmarkNumber(id);
		} else {
			clearBookmark();
			setBookmarkNumber(0);
		}
	};

	return (
		<ul className={css.items}>
			{items.length ? (
				items.map((item) => {
					return (
						<AuctionItem
							key={item.id}
							item={item}
							bookmark={bookmarkNumber}
							setBookmark={() => updateBookmark(item.id)}
						/>
					);
				})
			) : (
				<div className={css.noItems}>No items found.</div>
			)}
		</ul>
	);
};
