import { useQuery } from 'react-query';

const fetchItems = async () => {
	const auctionId = 339779;
	const response = await fetch(`/api/items/${auctionId}`);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	return response.json();
};

export const useItems = () => {
	return useQuery('Items', fetchItems, {
		// retry: 3,
		// refetchInterval: 60 * 1000, // once per minute
	});
};
export default useItems;
