import { useQuery } from 'react-query';

export type AdminStats = {
	fairName: string | null;
	lastUpdated: number | null;
	lastResult: 'NONE' | 'FAILURE' | 'SUCCESS' | 'RUNNING' | null;
	activeUsers: number;
	usersWithBggUsername: number;
	usersWithConfirmedBgg: number;
	usersWithLocationSquare: number;
	totalItems: number;
	itemsWithBids: number;
	endedAuctions: number;
	distinctSellers: number;
	distinctBidders: number;
	totalBidValue: number;
	meetupCount: number;
	meetupCompletedCount: number;
	likeCount: number;
};

const fetchAdminStats = async (): Promise<AdminStats> => {
	const res = await fetch('/api/admin/stats', { credentials: 'include' });
	const body = await res.json();
	if (!res.ok) throw new Error(body.error ?? 'Failed to load stats');
	return body;
};

export const useAdminStats = () => {
	const query = useQuery<AdminStats, Error>(['adminStats'], fetchAdminStats);

	return {
		stats: query.data ?? null,
		loading: query.isLoading,
		error: query.error?.message ?? null,
		refresh: query.refetch,
	};
};
