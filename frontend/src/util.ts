import { Item } from './model/Item';

export enum SORTING {
	MOST_RECENT,
	END_DATE,
	NAME,
	PRICE,
}

export const sortItems = (
	items: Item[],
	sorting: SORTING = SORTING.MOST_RECENT,
	// Buying/Selling want ended auctions pushed to the bottom regardless of
	// which sort the user picked - applied as a primary comparison ahead of
	// the chosen sort, which then only breaks ties within each group.
	endedLast: boolean = false
) => {
	const compare = sortingLookup[sorting];
	const comparator = endedLast
		? (a: Item, b: Item) =>
				isOver(a) != isOver(b) ? (isOver(a) ? 1 : -1) : compare(a, b)
		: compare;
	return items.sort(comparator);
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

// Only treated as a swipe when the horizontal movement clearly dominates
// over vertical (so normal vertical list-scrolling isn't hijacked) and
// exceeds threshold. Used by TabLayout to turn a touch gesture into
// tab navigation.
export const getSwipeDirection = (
	deltaX: number,
	deltaY: number,
	threshold: number = 60
): 'left' | 'right' | null => {
	if (Math.abs(deltaX) < threshold) return null;
	if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return null;
	return deltaX < 0 ? 'left' : 'right';
};

// Standard Web Push boilerplate: the browser's applicationServerKey option
// needs the VAPID public key as a Uint8Array, not the base64url string it's
// generated/transmitted as.
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, '+')
		.replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};
