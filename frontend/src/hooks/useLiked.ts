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

type UseLikedOptions = {
	// Set false on a page that must show a frozen snapshot (e.g. the "Outbid
	// & Liked" page, where unliking an item shouldn't make it disappear
	// until the page is reloaded) - fetches once on mount but never polls.
	poll?: boolean;
	// Set false when this instance only needs the mutations (e.g. a
	// per-item unlike button) and shouldn't fetch the liked list at all.
	enabled?: boolean;
};

export const useLiked = ({ poll = true, enabled = true }: UseLikedOptions = {}) => {
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
			enabled,
			refetchInterval: poll ? 60000 : false,
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

	// Like/unlike the item server-side but never touch the ['liked'] cache -
	// used where the currently rendered list must stay exactly as it was
	// until a manual reload (see `poll` above), even though the button
	// itself still toggles between the two states locally.
	const silentLikeMutation = useMutation(likeItem);
	const silentUnlikeMutation = useMutation(unlikeItem);

	const isLiked = (itemId: number) => {
		return likedQuery.data?.items.some((i) => i.id === itemId) ?? false;
	};

	return {
		likeItem: likeMutation.mutate,
		unlikeItem: unlikeMutation.mutate,
		likeItemSilently: silentLikeMutation.mutate,
		unlikeItemSilently: silentUnlikeMutation.mutate,
		isLiking: likeMutation.isLoading,
		isUnliking: unlikeMutation.isLoading,
		liked: likedQuery.data,
		isLoading: likedQuery.isLoading,
		isError: likedQuery.isError,
		refetch: likedQuery.refetch,
		isLiked,
	};
};
