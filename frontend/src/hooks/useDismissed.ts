import { useMutation } from 'react-query';

const dismissItem = async (itemId: number) => {
	const response = await fetch(`/api/dismissed/${itemId}`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to dismiss item');
	return response.json();
};

const undismissItem = async (itemId: number) => {
	const response = await fetch(`/api/dismissed/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) throw new Error('Failed to un-dismiss item');
	return response.json();
};

// Dismissal only ever shows up filtered into /api/outbids server-side
// (see backend/src/api/outbids) - there's no separate "my dismissed items"
// list rendered anywhere client-side, so unlike useLiked this has no query,
// just the two mutations, and they're always fired "silently" (no cache to
// invalidate) the same way useLiked's silent variants work on the frozen
// Outbid & Liked page.
export const useDismissed = () => {
	const dismissMutation = useMutation(dismissItem);
	const undismissMutation = useMutation(undismissItem);

	return {
		dismissItemSilently: dismissMutation.mutate,
		undismissItemSilently: undismissMutation.mutate,
	};
};
