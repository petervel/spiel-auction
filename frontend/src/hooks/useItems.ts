import axios from 'axios';
import { useInfiniteQuery } from 'react-query';
import { Item } from '../model/Item';
import useListId from './useListId';

interface PaginatedItems {
	items: Item[];
	hasMore: boolean;
	lastId: number | null;
}

const fetchItems = async ({
	pageParam = null,
	listId,
}: {
	pageParam?: number | null;
	listId: number;
}): Promise<PaginatedItems> => {
	const response = await axios.get<PaginatedItems>(`/api/items/${listId}`, {
		params: {
			lastId: pageParam || undefined,
		},
	});
	return response.data;
};

export const usePaginatedItems = () => {
	const listId = useListId();
	return useInfiniteQuery(
		['items', listId],
		({ pageParam }) => fetchItems({ pageParam, listId }),
		{
			getNextPageParam: (lastPage) =>
				lastPage.hasMore ? lastPage.lastId : undefined,
			refetchInterval: 30000, // Poll every 30 seconds
		}
	);
};

export default usePaginatedItems;
