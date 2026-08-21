export interface Fair {
	id: number;
	name: string;
	status: 'ACTIVE' | 'ARCHIVED';
	hidden: boolean;
	geeklistId: number;
	lastUpdated: number;
	lastResult: 'NONE' | 'FAILURE' | 'SUCCESS' | 'RUNNING';
	startedAt: number;
	listId: number | null;
}
