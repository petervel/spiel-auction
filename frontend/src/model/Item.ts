import { ItemComment } from './ItemComment';
import { List } from './List';

export interface Item {
	id: number;
	list: List;
	listId: number;

	objectType: string;
	objectSubtype: string;
	objectId: number;
	objectName: string;

	username: string;
	postDate: string;
	postTimestamp: number;
	editDate: string;
	editTimestamp: number;
	thumbs: number;
	imageId: number;

	body: string;

	comments: ItemComment[];

	// Derived data
	language: string;
	condition: string;

	startingBid: number;
	softReserve: number;
	hardReserve: number;
	binPrice: number;

	hasBids: boolean;
	isSold: boolean;
	isEnded: boolean;
	itemType: 'GAME' | 'PROMO' | 'OTHER';
	currentBid?: number;
	highestBidder?: string;

	auctionEnd: string;
	auctionEndDate: string;

	lastSeen: number;
	deleted: boolean;

	starred?: boolean;
}
