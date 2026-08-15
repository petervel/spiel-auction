import { useCallback, useMemo, useState } from 'react';
import { useUser } from './useUser';

export const useBggUsername = (pathOverride?: string) => {
	const { user, setUser, isLoading } = useUser();

	const [saving, setSaving] = useState(false);

	// The server is the only source of truth - no localStorage fallback,
	// so a logged-out visitor never has a BGG username to work with.
	const bggUsername = user?.bggUsername ?? undefined;

	// activeName is the username we're currently viewing: pathOverride (URL) wins,
	// otherwise fall back to the logged-in user's username.
	const activeName = useMemo(
		() => pathOverride ?? bggUsername,
		[pathOverride, bggUsername]
	);

	// isOwnName should compare the active page to the *logged-in user's* username
	// (not the hook's temp state that can be affected by pathOverride)
	const isOwnName = useMemo(
		() => Boolean(bggUsername && activeName === bggUsername),
		[bggUsername, activeName]
	);

	const updateBggUsername = useCallback(
		async (username?: string) => {
			if (!user) return;
			if (username) username = username.trim();

			setSaving(true);
			try {
				const method = username ? 'POST' : 'DELETE';
				const res = await fetch('/api/user/bggUsername', {
					method,
					headers: username
						? { 'Content-Type': 'application/json' }
						: undefined,
					credentials: 'include',
					body: username
						? JSON.stringify({ bggUsername: username })
						: undefined,
				});

				if (!res.ok) throw new Error('Failed to update BGG username');

				setUser({ ...user, bggUsername: username });
			} catch (err) {
				console.error(err);
			} finally {
				setSaving(false);
			}
		},
		[user, setUser]
	);

	return {
		activeName, // the username this page is showing (path or user)
		bggUsername, // logged-in user's username (from the server)
		setBggUsername: updateBggUsername, // function to save/update username
		removeBggUsername: () => updateBggUsername(undefined),
		saving,
		isLoading, // whether the logged-in user (and their username) is still resolving
		isOwnName,
	};
};
