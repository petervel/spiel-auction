import { QueryFunctionContext, useQuery } from 'react-query';
import { Item } from '../model/Item';
import { useListId } from './useListId';

interface FetchItemsParams {
	bidder?: string;
}

interface ResultType {
	items: Item[];
}

const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<[string, number, FetchItemsParams]>): Promise<ResultType> => {
	const [, listId, params] = queryKey;

	const url = new URL(`/api/outbids/${listId}`, window.location.origin);

	// Add query parameters if they exist
	if (params.bidder) url.searchParams.append('bidder', params.bidder);

	// Fetch data
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 404) {
			const body = await response.json().catch(() => null);
			if (body?.error === 'not_ready') {
				throw new Error('not_ready');
			}
		}
		throw new Error('Network response was not ok');
	}

	// Parse and return JSON data
	return response.json();
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
		retry: (failureCount, error) =>
			(error as Error).message !== 'not_ready' && failureCount < 3,
	});
};
