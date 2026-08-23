import { Item } from './model/Item';

export enum SORTING {
	MOST_RECENT,
	END_DATE,
	NAME,
	PRICE,
}

export const sortItems = (
	items: Item[],
	sorting: SORTING = SORTING.MOST_RECENT
) => {
	return items.sort(sortingLookup[sorting]);
};

const isOver = (item: Item) => item.isEnded || item.isSold;

const sortByMostRecent = (a: Item, b: Item): number => {
	return b.postTimestamp - a.postTimestamp;
};

const sortByEndDate = (a: Item, b: Item): number => {
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
};

const sortByName = (a: Item, b: Item): number => {
	return a.objectName.localeCompare(b.objectName);
};

const sortByPrice = (a: Item, b: Item): number => {
	if (a.currentBid == undefined) {
		return b.currentBid ?? 0;
	}
	return b.currentBid == undefined ? 0 : a.currentBid - b.currentBid;
};

const sortingLookup = {
	[SORTING.MOST_RECENT]: sortByMostRecent,
	[SORTING.END_DATE]: sortByEndDate,
	[SORTING.NAME]: sortByName,
	[SORTING.PRICE]: sortByPrice,
};
