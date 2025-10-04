import { QueryFunctionContext, useQuery } from 'react-query';
import { useListId } from './useListId';

interface FetchItemsParams {
	bidder?: string;
}
const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<[string, number, FetchItemsParams]>) => {
	const [, listId, params] = queryKey;

	const url = new URL(`/api/outbids/${listId}`, window.location.origin);

	// Add query parameters if they exist
	if (params.bidder) url.searchParams.append('bidder', params.bidder);

	// Fetch data
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Network response was not ok');
	}

	// Parse and return JSON data
	return response.json();
};

export const useOutbids = (params: { bidder?: string }) => {
	const listId = useListId();

	return useQuery(['outbids', listId, params], fetchItems, {
		enabled: Boolean(params.bidder),
		refetchInterval: 60000, // Automatically refetch data every 60 seconds
		keepPreviousData: true, // Retain previous data while fetching new data
	});
};
