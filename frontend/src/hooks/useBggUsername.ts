import { useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { useUser } from './useUser';

export const useBggUsername = () => {
	const { user, setUser, isLoading } = useUser();
	const [bggUsernameLS, setBggUsernameLS] = useLocalStorage<
		string | undefined
	>('bgg_username', undefined);

	const [bggUsername, setBggUsernameState] = useState<string | undefined>(
		undefined
	);
	const [saving, setSaving] = useState(false);

	// Sync state with UserContext or localStorage
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
	}, [user?.bggUsername, bggUsernameLS, setBggUsernameLS, isLoading]);

	const setBggUsername = async (username: string | undefined) => {
		setBggUsernameState(username);
		setBggUsernameLS(username);

		if (!user) return;

		setSaving(true);
		try {
			const res = await fetch('/api/user/bggUsername', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ bggUsername: username }),
			});
			if (!res.ok) throw new Error('Failed to update BGG username');

			setUser({ ...user, bggUsername: username });
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	};

	const removeBggUsername = async () => {
		setBggUsernameState(undefined);
		setBggUsernameLS(undefined);

		if (!user) return;

		setSaving(true);
		try {
			const res = await fetch('/api/user/bggUsername', {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to remove BGG username');

			setUser({ ...user, bggUsername: undefined });
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	};

	return { bggUsername, setBggUsername, saving, removeBggUsername };
};
