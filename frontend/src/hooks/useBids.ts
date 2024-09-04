import { QueryFunctionContext, useQuery } from 'react-query';
import { useListId } from './useListId';

interface FetchItemsParams {
	buyer?: string;
	seller?: string;
}
const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<[string, number, FetchItemsParams]>) => {
	const [, listId, params] = queryKey;

	// Construct URL
	const url = new URL(`/api/bids/${listId}`, window.location.origin);

	// Add query parameters if they exist
	if (params.buyer) url.searchParams.append('buyer', params.buyer);
	if (params.seller) url.searchParams.append('seller', params.seller);

	// Fetch data
	const response = await fetch(url);

	// Check for errors
	if (!response.ok) {
		throw new Error('Network response was not ok');
	}

	// Parse and return JSON data
	return response.json();
};

export const useBids = (params = {}) => {
	const listId = useListId();

	return useQuery(['bids', listId, params], fetchItems, {
		refetchInterval: 60000, // Automatically refetch data every 60 seconds
		keepPreviousData: true, // Retain previous data while fetching new data
	});
};
