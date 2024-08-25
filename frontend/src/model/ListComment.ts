import { List } from './List';

export interface ListComment {
	list: List;
	listId: number;
	username: string;
	date: string;
	postDate: string;
	postTimestamp: number;
	editDate: string;
	editTimestamp: number;
	thumbs: number;
	text: string;
	lastSeen: number;
	deleted: boolean;
}
