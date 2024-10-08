import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { Item } from '../model/Item';
import { useListId } from './useListId';

export interface ItemData {
	items: Item[];
	hasMore: boolean;
	lastId: number;
}

interface PageParam {
	data: ItemData;
	nextCursor: number;
}

const fetchItems = async (params: {
	queryData: QueryData;
	pageParam: PageParam | null;
	listId: number;
}) => {
	const { queryData, pageParam = null, listId } = params;

	const url = new URL(`/api/items/${listId}`, window.location.origin);

	const filter: FilterData = queryData.filter ?? {};
	for (const [k, v] of Object.entries(filter)) {
		if (v != undefined) {
			url.searchParams.append(k, v);
		}
	}

	if (pageParam) {
		url.searchParams.append('lastId', `${pageParam}`);
	}

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Network response was not ok.');
	}

	const data: ItemData = await response.json();
	return { data, nextCursor: data.lastId || null };
};

interface FilterData {
	buyer?: string;
	seller?: string;
	search?: string;
}
interface QueryData {
	filter?: FilterData;
}

export type SearchFilters = {
	search?: string;
};

export const useInfiniteItems = (
	queryData: QueryData = {},
	refetchInterval = 60000
) => {
	const listId = useListId();
	const [filters, setFilters] = useState<SearchFilters>({});

	return {
		...useInfiniteQuery(
			['infiniteItems', listId, queryData.filter, filters],
			({ pageParam }) =>
				fetchItems({
					queryData: { filter: { ...queryData.filter, ...filters } },
					pageParam,
					listId,
				}),
			{
				getNextPageParam: (lastPage) => lastPage.nextCursor,
				refetchInterval,
				refetchIntervalInBackground: true,
				keepPreviousData: true,
			}
		),
		filters,
		setFilters,
	};
};
