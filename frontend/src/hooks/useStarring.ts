import { useMutation, useQueryClient } from 'react-query';

// 🔹 Star an item
const starItem = async (itemId: number) => {
	const response = await fetch(`/api/user/starred/${itemId}`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		throw new Error('Failed to star item');
	}
	return response.json();
};

// 🔹 Unstar an item
const unstarItem = async (itemId: number) => {
	const response = await fetch(`/api/user/starred/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		throw new Error('Failed to unstar item');
	}
	return response.json();
};

export const useStarring = () => {
	const queryClient = useQueryClient();

	// Mutations for star/unstar
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

	return {
		starItem: starMutation.mutate,
		unstarItem: unstarMutation.mutate,
		isStarring: starMutation.isLoading,
		isUnstarring: unstarMutation.isLoading,
	};
};
