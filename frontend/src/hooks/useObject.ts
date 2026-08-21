import { useQuery } from 'react-query';
import { Item } from '../model/Item';
import { useListId } from './useListId';

const fetchObject = async (objectId: number, listId: number) => {
	const url = new URL(`/api/object/${objectId}`, window.location.origin);
	url.searchParams.set('listId', String(listId));

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	const items: Item[] = await response.json();
	return items;
};

export const useObject = (objectId: number) => {
	const listId = useListId();

	return useQuery(
		['object', objectId, listId],
		() => fetchObject(objectId, listId),
		{
			retry: 3,
			refetchInterval: 60 * 1000, // once per minute
		}
	);
};
export default useObject;
