import { useQuery, useQueryClient } from 'react-query';

const fetchLocationCounts = async (): Promise<Record<string, number>> => {
	const response = await fetch('/api/user/location/counts', {
		credentials: 'include',
	});
	if (!response.ok) {
		throw new Error('Error fetching location counts');
	}
	const data = await response.json();
	return data.counts;
};

export const LOCATION_COUNTS_QUERY_KEY = 'locationCounts';

export const useLocationCounts = () => {
	const query = useQuery(LOCATION_COUNTS_QUERY_KEY, fetchLocationCounts, {
		retry: 3,
	});
	const queryClient = useQueryClient();

	return {
		...query,
		// Called after the viewer's own pick saves, so the glow reflects it
		// immediately instead of waiting for the next natural refetch.
		refresh: () => queryClient.invalidateQueries(LOCATION_COUNTS_QUERY_KEY),
	};
};
