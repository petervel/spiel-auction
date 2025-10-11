import { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { useUser } from './useUser';

export const useBggUsername = (pathOverride?: string) => {
	const { user, setUser, isLoading } = useUser();

	const [bggUsernameLS, setBggUsernameLS] = useLocalStorage<
		string | undefined
	>('bgg_username', undefined);

	// local state for the logged-in user's BGG username (from user or LS)
	const [bggUsername, setBggUsernameState] = useState<string | undefined>(
		undefined
	);

	const [saving, setSaving] = useState(false);

	// Always sync the local bggUsername from the user context or localStorage
	// (don't early-return on pathOverride — we want the logged-in username available)
	useEffect(() => {
		if (isLoading) return;

		if (user?.bggUsername) {
			setBggUsernameState(user.bggUsername);
			if (user.bggUsername !== bggUsernameLS) {
				setBggUsernameLS(user.bggUsername);
			}
		} else {
			setBggUsernameState(bggUsernameLS);
		}
	}, [isLoading, user?.bggUsername, bggUsernameLS, setBggUsernameLS]);

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

	// Save or remove the username. We optimistically update local state + LS,
	// and then call the server if the user exists.
	const updateBggUsername = useCallback(
		async (username?: string) => {
			// optimistic local update
			if (username) username = username.trim();

			setBggUsernameState(username);
			setBggUsernameLS(username);

			// if there's no logged-in user, we just persist locally
			if (!user) return;

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

				// update user in context with the new value
				setUser({ ...user, bggUsername: username });
			} catch (err) {
				console.error(err);
				// optionally: revert optimistic changes here (e.g. setBggUsernameState(prev))
			} finally {
				setSaving(false);
			}
		},
		[user, setUser, setBggUsernameLS]
	);

	return {
		activeName, // the username this page is showing (path or user)
		bggUsername, // logged-in user's username (from user or localStorage)
		setBggUsername: updateBggUsername, // function to save/update username
		removeBggUsername: () => updateBggUsername(undefined),
		saving,
		isOwnName,
	};
};
