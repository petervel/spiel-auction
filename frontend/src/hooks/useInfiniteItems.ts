import { useInfiniteQuery } from 'react-query';
import { Item } from '../model/Item';
import useListId from './useListId';

export interface ItemData {
	items: Item[];
	hasMore: boolean;
}

interface PageParam {
	data: ItemData;
	nextCursor: number;
}

const fetchItems = async (params: {
	pageParam: PageParam | null;
	listId: number;
}) => {
	const { pageParam = null, listId } = params;

	const url = new URL(`/api/items/${listId}`, window.location.origin);
	if (pageParam) {
		url.searchParams.append('lastId', `${pageParam}`);
	}

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Network response was not ok.');
	}

	const data = await response.json();
	console.log({ data, nextCursor: data[data.length - 1]?.id });
	return { data, nextCursor: data.lastId || null };
};

export const useInfiniteItems = (refetchInterval = 60000) => {
	const listId = useListId();

	return useInfiniteQuery(
		['infiniteItems', listId],
		({ pageParam }) => fetchItems({ pageParam, listId }),
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			refetchInterval,
			refetchIntervalInBackground: true,
		}
	);
};

export default useInfiniteItems;
