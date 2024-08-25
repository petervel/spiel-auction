import { Fair } from './Fair';
import { Item } from './Item';
import { ListComment } from './ListComment';

export interface List {
	id: number;
	fair: Fair;
	title: string;
	username: string;
	postDate: string;
	postTimestamp: number;
	editDate: string;
	editTimestamp: number;
	thumbs: number;
	itemCount: number;
	description: string;
	tosUrl: string;
	comments: ListComment[];
	items: Item[];
	lastSeen: number;
	deleted: boolean;
}
