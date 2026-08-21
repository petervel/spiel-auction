export interface Fair {
	id: number;
	name: string;
	status: 'ACTIVE' | 'ARCHIVED';
	geeklistId: number;
	lastUpdated: number;
	lastResult: 'NONE' | 'FAILURE' | 'SUCCESS' | 'RUNNING';
	startedAt: number;
	listId: number | null;
}
