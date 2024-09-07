import { useState } from 'react';
import { useQuery } from 'react-query';

const fetchObject = async (search: string | undefined) => {
	const url = new URL(`/api/object`, window.origin);
	if (search) {
		url.searchParams.append('search', search);
	}
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	return await response.json();
};

export const useObjects = (initialSearch: string | undefined) => {
	const [search, setSearch] = useState<string | undefined>(initialSearch);

	return {
		...useQuery<BggObject[]>(
			`objects:${search}`,
			() => fetchObject(search),
			{
				retry: 3,
			}
		),
		search,
		setSearch,
	};
};

export type BggObject = {
	objectId: number;
	objectName: string;
	objectSubtype: string;
};
