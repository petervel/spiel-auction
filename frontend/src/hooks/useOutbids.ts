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

export const useOutbids = ({
	bidder,
	poll = true,
}: {
	bidder?: string;
	// Set false on a page that must show a frozen snapshot (e.g. the
	// "Outbid & Liked" page) - fetches once on mount but never polls.
	poll?: boolean;
}) => {
	const listId = useListId();
	const params: FetchItemsParams = { bidder };

	return useQuery<
		ResultType,
		Error,
		ResultType,
		[string, number, FetchItemsParams]
	>(['outbids', listId, params], fetchItems, {
		enabled: Boolean(bidder),
		refetchInterval: poll ? 60000 : false,
		keepPreviousData: true, // Retain previous data while fetching new data
		retry: retryUnlessNotReady,
	});
};
