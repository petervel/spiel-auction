import { List } from './List';

export interface Fair {
	id: number;
	name: string;
	status: 'ACTIVE' | 'ARCHIVED';
	geekListId: number;
	lastUpdated: number;
	lastResult: 'NONE' | 'FAILURE' | 'SUCCESS' | 'RUNNING';
	startedAt: number;
	list: List;
	listId: number;
}
