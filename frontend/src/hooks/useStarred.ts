import { useQuery } from 'react-query';
import { Item } from '../model/Item';

// 🔹 Fetch all starred items
const fetchStarred = async (): Promise<Item[]> => {
	const response = await fetch('/api/starred', { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Failed to fetch starred items');
	}
	return response.json();
};

export const useStarred = () => {
	// Get starred items
	const starredQuery = useQuery<Item[]>(['starred'], fetchStarred, {
		refetchInterval: 60000, // refresh every 60s
		keepPreviousData: true,
	});

	return {
		starred: starredQuery.data,
		isLoading: starredQuery.isLoading,
		isError: starredQuery.isError,
		refetch: starredQuery.refetch,
	};
};
