import { useQuery } from 'react-query';
import { Fair } from '../model/Fair';

const fetchFairs = async (): Promise<Fair[]> => {
	const response = await fetch('/api/fairs', { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Error fetching fairs');
	}
	return response.json();
};

export const useFairs = () => {
	return useQuery('fairs', fetchFairs, { retry: 3 });
};
