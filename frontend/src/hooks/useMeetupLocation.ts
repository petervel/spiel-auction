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
	// along) and for a description-only save (passing the current square).
	const setLocation = useCallback(
		async (newSquare: string, newDescription: string | null) => {
			if (!user?.currentUserFair) return false;

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

				if (!res.ok) throw new Error('Failed to update location');

				setUser({
					...user,
					currentUserFair: {
						...user.currentUserFair,
						locationSquare: newSquare,
						locationDescription: newDescription,
					},
				});
				return true;
			} catch (err) {
				console.error(err);
				return false;
			} finally {
				setSaving(false);
			}
		},
		[user, setUser]
	);

	return { square, description, setLocation, saving };
};
