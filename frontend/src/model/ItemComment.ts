import { Item } from './Item';

export interface ItemComment {
	item: Item;
	itemId: number;
	username: string;
	date: string;
	postDate: string;
	postTimestamp: number;
	editDate: string;
	editTimestamp: number;
	thumbs: number;
	text: string;
	isBin: boolean;
	bid: number;
	lastSeen: number;
	deleted: boolean;
}
