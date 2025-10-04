import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Item } from '../model/Item';
import { useUser } from './useUser';

// 🔹 Fetch all starred items
const fetchStarred = async (): Promise<{items: Item[]}> => {
	const response = await fetch('/api/starred', { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Failed to fetch starred items');
	}
	return response.json();
};

// 🔹 Star an item
const starItem = async (itemId: number) => {
	const response = await fetch(`/api/starred/${itemId}`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to star item');
	return response.json();
};

// 🔹 Unstar an item
const unstarItem = async (itemId: number) => {
	const response = await fetch(`/api/starred/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to unstar item');
	return response.json();
};

export const useStarred = () => {
	const queryClient = useQueryClient();
	const { user, isLoading } = useUser();

	// Get starred items
	const starredQuery = useQuery<{items: Item[]} | undefined>(
		['starred'],
		async () => {
			if (!isLoading && !user) return undefined; // not logged in
			return await fetchStarred();
		},
		{
			refetchInterval: 60000, // refresh every 60s
			keepPreviousData: true,
		}
	);

	// Mutations
	const starMutation = useMutation(starItem, {
		onSuccess: () => {
			queryClient.invalidateQueries(['starred']);
		},
	});

	const unstarMutation = useMutation(unstarItem, {
		onSuccess: () => {
			queryClient.invalidateQueries(['starred']);
		},
	});

	const isStarred = (itemId: number) => {
		return starredQuery.data?.items.some((i) => i.id === itemId) ?? false;
	};

	return {
		starItem: starMutation.mutate,
		unstarItem: unstarMutation.mutate,
		isStarring: starMutation.isLoading,
		isUnstarring: unstarMutation.isLoading,
		starred: starredQuery.data,
		isLoading: starredQuery.isLoading,
		isError: starredQuery.isError,
		refetch: starredQuery.refetch,
		isStarred,
	};
};
