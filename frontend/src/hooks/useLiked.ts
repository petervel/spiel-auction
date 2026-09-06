import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Item } from '../model/Item';
import { useUser } from './useUser';

// 🔹 Fetch all liked items
const fetchLiked = async (): Promise<{items: Item[]}> => {
	const response = await fetch('/api/liked', { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Failed to fetch liked items');
	}
	return response.json();
};

// 🔹 Like an item
const likeItem = async (itemId: number) => {
	const response = await fetch(`/api/liked/${itemId}`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to like item');
	return response.json();
};

// 🔹 Unlike an item
const unlikeItem = async (itemId: number) => {
	const response = await fetch(`/api/liked/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to unlike item');
	return response.json();
};

export const useLiked = () => {
	const queryClient = useQueryClient();
	const { user, isLoading } = useUser();

	// Get liked items
	const likedQuery = useQuery<{items: Item[]} | undefined>(
		['liked'],
		async () => {
			if (!isLoading && !user) return undefined; // not logged in
			return await fetchLiked();
		},
		{
			refetchInterval: 60000, // refresh every 60s
			keepPreviousData: true,
		}
	);

	// Mutations
	const likeMutation = useMutation(likeItem, {
		onSuccess: () => {
			queryClient.invalidateQueries(['liked']);
		},
	});

	const unlikeMutation = useMutation(unlikeItem, {
		onSuccess: () => {
			queryClient.invalidateQueries(['liked']);
		},
	});

	const isLiked = (itemId: number) => {
		return likedQuery.data?.items.some((i) => i.id === itemId) ?? false;
	};

	return {
		likeItem: likeMutation.mutate,
		unlikeItem: unlikeMutation.mutate,
		isLiking: likeMutation.isLoading,
		isUnliking: unlikeMutation.isLoading,
		liked: likedQuery.data,
		isLoading: likedQuery.isLoading,
		isError: likedQuery.isError,
		refetch: likedQuery.refetch,
		isLiked,
	};
};
