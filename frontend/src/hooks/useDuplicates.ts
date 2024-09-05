import { useQuery } from 'react-query';
import { Item } from '../model/Item';
import useListId from './useListId';

const fetchObject = async (listId: number) => {
	const response = await fetch(`/api/duplicates/${listId}`);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	const items: Item[] = await response.json();
	return items;
};

export const useDuplicates = () => {
	const listId = useListId();

	return useQuery(`duplicates`, () => fetchObject(listId), {
		retry: 3,
		refetchInterval: 60 * 1000, // once per minute
	});
};
