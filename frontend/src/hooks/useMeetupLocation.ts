import { useCallback, useState } from 'react';
import { useUser } from './useUser';

// Not useLocation - collides with react-router-dom's own hook of that name.
export const useMeetupLocation = () => {
	const { user, setUser } = useUser();

	const [saving, setSaving] = useState(false);

	const square = user?.currentUserFair?.locationSquare ?? null;
	const description = user?.currentUserFair?.locationDescription ?? null;

	// Square and description are always sent together - the map page uses
	// this both for clicking a square (passing the current description
	// along), a description-only save (passing the current square), and
	// deselecting the current square (passing null to clear it).
	const setLocation = useCallback(
		async (
			newSquare: string | null,
			newDescription: string | null,
		): Promise<{ success: boolean; error?: string }> => {
			if (!user?.currentUserFair) return { success: false };

			setSaving(true);
			try {
				const res = await fetch('/api/user/location', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						square: newSquare,
						description: newDescription,
					}),
				});

				if (!res.ok) {
					// 403 here means "not verified" - surface the server's own
					// message rather than a generic failure, since the page's
					// own verification gate can go stale (e.g. another tab).
					const { error } = await res.json().catch(() => ({}));
					return { success: false, error };
				}

				setUser({
					...user,
					currentUserFair: {
						...user.currentUserFair,
						locationSquare: newSquare,
						locationDescription: newDescription,
					},
				});
				return { success: true };
			} catch (err) {
				console.error(err);
				return { success: false };
			} finally {
				setSaving(false);
			}
		},
		[user, setUser],
	);

	return { square, description, setLocation, saving };
};
