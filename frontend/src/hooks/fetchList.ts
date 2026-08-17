// Shared by list-scoped hooks (useInfiniteItems, useBids, useOutbids):
// fetches a URL and distinguishes "fair exists but hasn't imported yet"
// (see backend/src/api/listLookup.ts) from a genuine failure.
export const fetchListJson = async <T>(url: URL): Promise<T> => {
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 404) {
			const body = await response.json().catch(() => null);
			if (body?.error === 'not_ready') {
				throw new Error('not_ready');
			}
		}
		throw new Error('Network response was not ok.');
	}

	return response.json();
};

// react-query retry option: a "not ready yet" error won't resolve by
// retrying immediately, so don't bother.
export const retryUnlessNotReady = (failureCount: number, error: unknown) =>
	(error as Error).message !== 'not_ready' && failureCount < 3;
