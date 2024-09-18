import { Item } from './model/Item';

export const sortItems = (items: Item[]) => {
	const isOver = (item: Item) => item.isEnded || item.isSold;

	return items.sort((a: Item, b: Item) => {
		if (isOver(a) != isOver(b)) {
			return isOver(a) ? 1 : -1;
		}
		if (a.auctionEndDate != b.auctionEndDate) {
			const bNumber = +b.auctionEndDate;
			if (Number.isNaN(bNumber)) return 1;
			const aNumber = +a.auctionEndDate;
			if (Number.isNaN(aNumber)) {
				return -1;
			}
			return aNumber - bNumber;
		}
		if (a.hasBids != b.hasBids) {
			return a.hasBids ? -1 : 1;
		}
		return b.id - a.id;
	});
};
