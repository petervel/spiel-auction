import { QueryFunctionContext, useQuery } from 'react-query';
import { Item } from '../model/Item';
import { fetchListJson, retryUnlessNotReady } from './fetchList';
import { useListId } from './useListId';

type ResultType = {
	totalPrice: number;
	items: Item[];
};

interface FetchItemsParams {
	buyer?: string;
	seller?: string;
}

const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<
	[string, number, FetchItemsParams]
>): Promise<ResultType> => {
	const [, listId, params] = queryKey;

	const url = new URL(`/api/bids/${listId}`, window.location.origin);

	if (params.buyer) url.searchParams.append('buyer', params.buyer);
	if (params.seller) url.searchParams.append('seller', params.seller);

	return fetchListJson<ResultType>(url);
};

export const useBids = (params: FetchItemsParams = {}) => {
	const listId = useListId();

	const hasFilters = Boolean(params.buyer || params.seller);
	return useQuery<
		ResultType,
		Error,
		ResultType,
		[string, number, FetchItemsParams]
	>(['bids', listId, params], fetchItems, {
		enabled: hasFilters,
		refetchInterval: 60000,
		keepPreviousData: true,
		retry: retryUnlessNotReady,
	});
};
