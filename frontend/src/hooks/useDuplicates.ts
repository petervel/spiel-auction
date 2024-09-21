import { useQuery } from 'react-query';
import { Item } from '../model/Item';
import { useListId } from './useListId';

export type UserDupes = {
	username: string;
	maxId: number;
	dupes: [
		{
			objectName: string;
			items: Item[];
		}
	];
};
const fetchObject = async (listId: number) => {
	const response = await fetch(`/api/duplicates/${listId}`);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	const items: UserDupes[] = await response.json();
	return items;
};

export const useDuplicates = () => {
	const listId = useListId();

	return useQuery(`duplicates`, () => fetchObject(listId), {
		retry: 3,
		refetchInterval: 60 * 1000, // once per minute
	});
};
