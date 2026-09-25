import { useCallback, useMemo, useState } from 'react';
import { useUser } from './useUser';

export type BggVerification = {
	exists: boolean;
	bggUsername?: string;
	hash?: string;
	confirmed?: boolean;
};

export const useBggUsername = (pathOverride?: string) => {
	const { user, setUser, isLoading } = useUser();

	const [saving, setSaving] = useState(false);

	// Verification is never auto-fetched here - this hook also backs
	// useTabPages (runs on every page) and UserItemsPage (viewing someone
	// else's username), neither of which should pay for an extra request
	// that's only relevant on Settings. Callers fetch it explicitly.
	const [verification, setVerification] = useState<BggVerification | null>(
		null,
	);
	const [verifying, setVerifying] = useState(false);

	// The server is the only source of truth - no localStorage fallback,
	// so a logged-out visitor never has a BGG username to work with.
	const bggUsername = user?.bggUsername ?? undefined;

	// activeName is the username we're currently viewing: pathOverride (URL) wins,
	// otherwise fall back to the logged-in user's username.
	const activeName = useMemo(
		() => pathOverride ?? bggUsername,
		[pathOverride, bggUsername],
	);

	// isOwnName should compare the active page to the *logged-in user's* username
	// (not the hook's temp state that can be affected by pathOverride)
	const isOwnName = useMemo(
		() => Boolean(bggUsername && activeName === bggUsername),
		[bggUsername, activeName],
	);

	const updateBggUsername = useCallback(
		async (username?: string) => {
			if (!user) return;
			if (username) username = username.trim();

			setSaving(true);
			try {
				// The backend only exposes POST /bggUsername (no DELETE route) -
				// it already treats a null body as "clear it".
				const res = await fetch('/api/user/bggUsername', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ bggUsername: username || null }),
				});

				if (!res.ok) throw new Error('Failed to update BGG username');

				setUser({ ...user, bggUsername: username });
				// Verification is tracked per username, not deleted on change -
				// clear the local copy so the UI doesn't show the OLD username's
				// status while the new one's is being fetched (SettingsPage
				// re-fetches whenever bggUsername changes).
				setVerification(null);
			} catch (err) {
				console.error(err);
			} finally {
				setSaving(false);
			}
		},
		[user, setUser],
	);

	const fetchVerification = useCallback(async () => {
		try {
			const res = await fetch('/api/user/bggUsername/verify', {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch verification status');
			setVerification(await res.json());
		} catch (err) {
			console.error(err);
		}
	}, []);

	const startVerification = useCallback(async () => {
		setVerifying(true);
		try {
			const res = await fetch('/api/user/bggUsername/verify', {
				method: 'POST',
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to start verification');
			setVerification({ exists: true, ...(await res.json()) });
		} catch (err) {
			console.error(err);
		} finally {
			setVerifying(false);
		}
	}, []);

	// Distinguishes "checked, not found yet" (confirmed: false) from
	// "couldn't reach BGG" (unreachable: true) so the UI can show a
	// different message for each rather than treating both as failure.
	const checkVerification = useCallback(async (): Promise<{
		confirmed: boolean;
		unreachable?: boolean;
	}> => {
		setVerifying(true);
		try {
			const res = await fetch('/api/user/bggUsername/verify/check', {
				method: 'POST',
				credentials: 'include',
			});
			if (res.status === 502)
				return { confirmed: false, unreachable: true };
			if (!res.ok) throw new Error('Failed to check verification');
			const { confirmed } = await res.json();
			setVerification((prev) => (prev ? { ...prev, confirmed } : prev));
			return { confirmed };
		} catch (err) {
			console.error(err);
			return { confirmed: false, unreachable: true };
		} finally {
			setVerifying(false);
		}
	}, []);

	return {
		activeName, // the username this page is showing (path or user)
		bggUsername, // logged-in user's username (from the server)
		setBggUsername: updateBggUsername, // function to save/update username
		removeBggUsername: () => updateBggUsername(undefined),
		saving,
		isLoading, // whether the logged-in user (and their username) is still resolving
		isOwnName,
		verification, // null until fetchVerification() is called
		verifying,
		fetchVerification,
		startVerification,
		checkVerification,
	};
};
