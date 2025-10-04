import { QueryFunctionContext, useQuery } from 'react-query';
import { useListId } from './useListId';
import { Item } from '../model/Item';


type ResultType = {
	totalPrice: number;
	items: Item[];
}

interface FetchItemsParams {
	buyer?: string;
	seller?: string;
}

const fetchItems = async ({
	queryKey,
}: QueryFunctionContext<[string, number, FetchItemsParams]>): Promise<ResultType> => {
	const [, listId, params] = queryKey;

	const url = new URL(`/api/bids/${listId}`, window.location.origin);

	if (params.buyer) url.searchParams.append('buyer', params.buyer);
	if (params.seller) url.searchParams.append('seller', params.seller);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Network response was not ok');
	}

	return response.json();
};

export const useBids = (params: FetchItemsParams = {}) => {
	const listId = useListId();

	const hasFilters = Boolean(params.buyer || params.seller)
	return useQuery<
			ResultType,
			Error,
			ResultType,
			[string, number, FetchItemsParams]
		>(
			['bids', listId, params], fetchItems, {
				enabled: hasFilters,
				refetchInterval: 60000,
				keepPreviousData: true,
			}
		);
};
