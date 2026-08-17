import { QueryFunctionContext, useQuery } from 'react-query';
import { Item } from '../model/Item';
import { fetchListJson, retryUnlessNotReady } from './fetchList';
import { useListId } from './useListId';

interface FetchItemsParams {
	bidder?: string;
}

interface ResultType {
	items: Item[];
}

const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<
	[string, number, FetchItemsParams]
>): Promise<ResultType> => {
	const [, listId, params] = queryKey;

	const url = new URL(`/api/outbids/${listId}`, window.location.origin);

	if (params.bidder) url.searchParams.append('bidder', params.bidder);

	return fetchListJson<ResultType>(url);
};

export const useOutbids = (params: { bidder?: string }) => {
	const listId = useListId();

	return useQuery<
		ResultType,
		Error,
		ResultType,
		[string, number, FetchItemsParams]
	>(['outbids', listId, params], fetchItems, {
		enabled: Boolean(params.bidder),
		refetchInterval: 60000, // Automatically refetch data every 60 seconds
		keepPreviousData: true, // Retain previous data while fetching new data
		retry: retryUnlessNotReady,
	});
};
