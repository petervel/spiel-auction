import { useQuery } from 'react-query';
import { Item } from '../model/Item';

const fetchItem = async (itemId: number): Promise<Item> => {
	const response = await fetch(`/api/item/${itemId}`);
	if (!response.ok) {
		throw new Error('Error fetching item');
	}
	return response.json();
};

export const useItem = (itemId: number) => {
	return useQuery(['item', itemId], () => fetchItem(itemId), {
		retry: 3,
		refetchInterval: 60 * 1000, // once per minute
	});
};
export default useItem;
