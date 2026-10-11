import { useCallback, useState } from 'react';

export type LocationSearchResult = {
	bggUsername: string;
	square: string | null;
	description: string | null;
};

// Fuzzy BGG username search, scoped to people who've set a meetup spot for
// the caller's current fair - same submit-then-list-results shape as the
// admin "emulate user" search.
export const useLocationSearch = () => {
	const [results, setResults] = useState<LocationSearchResult[] | null>(
		null
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Returns the results directly (as well as setting state), so a caller
	// that wants to act on them immediately - e.g. auto-selecting a single
	// match - doesn't need an effect watching `results` to do it.
	const search = useCallback(
		async (query: string): Promise<LocationSearchResult[] | null> => {
			const trimmed = query.trim();
			if (trimmed.length < 2) {
				setError('Search for at least 2 characters.');
				setResults(null);
				return null;
			}

			setLoading(true);
			setError(null);
			try {
				const res = await fetch(
					`/api/user/location/search?bggUsername=${encodeURIComponent(trimmed)}`,
					{ credentials: 'include' }
				);
				const body = await res.json();
				if (!res.ok) {
					setError(body.error ?? 'Search failed');
					setResults(null);
					return null;
				}
				setResults(body.results);
				return body.results;
			} catch (err) {
				console.error(err);
				setError('Search failed');
				setResults(null);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	return { results, loading, error, search };
};
