import { useMutation, useQuery, useQueryClient } from 'react-query';
import { BggObject } from '../model/BggObject';
import { Item } from '../model/Item';
import { useUser } from './useUser';

// Each wishlisted object annotated with its current-fair auction items (if
// any) - lets the wishlist page split "has an active auction" from
// "nothing listed yet" without an extra fetch per object.
export type WishlistObject = BggObject & { items: Item[] };

const fetchWishlist = async (): Promise<{ objects: WishlistObject[] }> => {
	const response = await fetch('/api/wishlist', { credentials: 'include' });
	if (!response.ok) {
		throw new Error('Failed to fetch wishlist');
	}
	return response.json();
};

const addToWishlist = async ({ object }: { object: BggObject }) => {
	const { objectId, ...meta } = object;
	const response = await fetch(`/api/wishlist/${objectId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(meta),
	});
	if (!response.ok) throw new Error('Failed to add to wishlist');
	return response.json();
};

const removeFromWishlist = async (objectId: number) => {
	const response = await fetch(`/api/wishlist/${objectId}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to remove from wishlist');
	return response.json();
};

// Re-adds a previously-wishlisted object by id alone, with no metadata body -
// only valid where the BggObject is already known to exist server-side
// (the backend only requires objectType/objectSubtype/objectName when
// creating a BggObject for the first time). Used for the wishlist page's
// silent star toggle, where every object shown was already wishlisted once.
const addToWishlistById = async (objectId: number) => {
	const response = await fetch(`/api/wishlist/${objectId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({}),
	});
	if (!response.ok) throw new Error('Failed to add to wishlist');
	return response.json();
};

const importWishlist = async (items: BggObject[]) => {
	const response = await fetch('/api/wishlist/import', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ items }),
	});
	if (!response.ok) throw new Error('Failed to import wishlist');
	return response.json();
};

export const useWishlist = () => {
	const queryClient = useQueryClient();
	const { user, isLoading: userLoading } = useUser();

	const wishlistQuery = useQuery<{ objects: WishlistObject[] } | undefined>(
		['wishlist'],
		async () => {
			if (!userLoading && !user) return undefined; // not logged in
			return await fetchWishlist();
		},
		{ keepPreviousData: true }
	);

	const invalidate = () => queryClient.invalidateQueries(['wishlist']);

	const addMutation = useMutation(addToWishlist, { onSuccess: invalidate });
	const removeMutation = useMutation(removeFromWishlist, {
		onSuccess: invalidate,
	});
	const importMutation = useMutation(importWishlist, {
		onSuccess: invalidate,
	});

	// Mutate server-side but never touch the ['wishlist'] cache - used by the
	// wishlist page's own star toggle, which tracks its own local state so
	// the list on screen stays exactly as it was loaded until a manual reload.
	const silentAddMutation = useMutation(addToWishlistById);
	const silentRemoveMutation = useMutation(removeFromWishlist);

	const isWishlisted = (objectId: number) =>
		wishlistQuery.data?.objects.some((o) => o.objectId === objectId) ?? false;

	return {
		wishlist: wishlistQuery.data,
		isLoading: wishlistQuery.isLoading,
		isError: wishlistQuery.isError,
		isWishlisted,
		addToWishlist: (object: BggObject) => addMutation.mutate({ object }),
		removeFromWishlist: removeMutation.mutate,
		addToWishlistSilently: silentAddMutation.mutate,
		removeFromWishlistSilently: silentRemoveMutation.mutate,
		importWishlist: importMutation.mutate,
		isImporting: importMutation.isLoading,
	};
};
