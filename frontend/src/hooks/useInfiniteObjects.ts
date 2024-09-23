import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useListId } from './useListId';

interface QueryData {
	filter?: FilterData;
}
export interface ObjectData {
	objects: BggObject[];
	hasMore: boolean;
	lastIndex: number;
}

interface PageParam {
	data: ObjectData;
	lastIndex: number;
}

const fetchObjects = async (params: {
	queryData: QueryData;
	pageParam: PageParam | null;
	listId: number;
}) => {
	const { queryData, pageParam = null, listId } = params;

	const url = new URL(`/api/objects/${listId}`, window.location.origin);

	const filter: FilterData = queryData.filter ?? {};
	for (const [k, v] of Object.entries(filter)) {
		if (v != undefined) {
			url.searchParams.append(k, v);
		}
	}

	if (pageParam) {
		url.searchParams.append('offset', `${pageParam.lastIndex ?? 0}`);
	}

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Network response was not ok.');
	}

	const data: ObjectData = await response.json();
	return data;
};

interface FilterData {
	buyer?: string;
	seller?: string;
	search?: string;
}

export const useInfiniteObjects = (initialSearch: string | undefined) => {
	const listId = useListId();
	const [filters, setFilters] = useState<FilterData>({
		search: initialSearch,
	});

	return {
		...useInfiniteQuery(
			['infiniteItems', listId, filters],
			({ pageParam }) => {
				return fetchObjects({
					queryData: { filter: filters },
					pageParam,
					listId,
				});
			},
			{
				getNextPageParam: (lastPage) =>
					lastPage.hasMore ? lastPage : undefined,
				retry: 3,
				keepPreviousData: true,
			}
		),
		filters,
		setFilters,
	};
};

export type BggObject = {
	objectId: number;
	objectName: string;
	objectSubtype: string;
};
