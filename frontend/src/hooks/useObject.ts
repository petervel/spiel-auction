import { useQuery } from 'react-query';
import { Item } from '../model/Item';

const fetchObject = async (objectId: number) => {
	const response = await fetch(`/api/object/${objectId}`);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	const items: Item[] = await response.json();
	return items;
};

export const useObject = (objectId: number) => {
	return useQuery(`object:${objectId}`, () => fetchObject(objectId), {
		retry: 3,
		refetchInterval: 60 * 1000, // once per minute
	});
};
export default useObject;
