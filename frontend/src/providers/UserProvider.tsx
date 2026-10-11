import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { User } from '../model/User';

const MIN_VISIBILITY_REFETCH_MS = 30_000;

// A network error or 5xx from /me means "we don't know yet" (e.g. the
// backend container is mid-restart, or the DB isn't reachable yet) - not
// "you're logged out". Retried a handful of times before falling back to
// treating it as logged out, rather than reporting that immediately and
// (since every page checks isLoading before `!user`) flashing a wrong
// "log in to see this" message during a routine few-second restart.
const ME_RETRY_COUNT = 8;
const ME_RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setLoading] = useState(true);
	const [realAdmin, setRealAdmin] = useState(false);
	const [emulating, setEmulating] = useState(false);
	const [isLoginDialogOpen, setLoginDialogOpen] = useState(false);
	const lastFetchAtRef = useRef(0);

	const fetchCurrentUser = async () => {
		lastFetchAtRef.current = Date.now();

		for (let attempt = 0; attempt <= ME_RETRY_COUNT; attempt++) {
			try {
				const res = await fetch('/api/auth/me', {
					credentials: 'include',
				}); // include cookie!
				if (res.ok) {
					const data = await res.json();
					// console.log('Fetched current user:', data);
					setUser(data.user ?? null);
					setRealAdmin(!!data.realAdmin);
					setEmulating(!!data.emulating);
					setLoading(false);
					return;
				}
				if (res.status < 500) {
					// A definitive non-transient response - /me doesn't
					// normally send one, but don't retry forever if it ever
					// does.
					setUser(null);
					setRealAdmin(false);
					setEmulating(false);
					setLoading(false);
					return;
				}
				// 5xx (including nginx's own 502/503/504 while the backend
				// isn't listening yet) - transient, fall through to retry.
			} catch (err) {
				// Network-level failure (e.g. connection refused while the
				// container is still starting) - also transient.
				if (attempt === ME_RETRY_COUNT) {
					console.error('Failed to fetch current user:', err);
				}
			}

			if (attempt < ME_RETRY_COUNT) await sleep(ME_RETRY_DELAY_MS);
		}

		// Retries exhausted - fall back to "logged out" rather than
		// spinning forever.
		setUser(null);
		setRealAdmin(false);
		setEmulating(false);
		setLoading(false);
	};

	useEffect(() => {
		// fetch once on mount, regardless of visibility, to bootstrap auth state
		fetchCurrentUser();

		// Poll only while the tab is actually visible - a backgrounded/
		// forgotten tab shouldn't keep silently polling. Refetch
		// immediately when it becomes visible again, so returning to the
		// tab doesn't wait up to 5m for fresh state.
		let interval: ReturnType<typeof setInterval> | undefined;

		const startPolling = () => {
			if (interval) return;
			interval = setInterval(fetchCurrentUser, 300_000); // every 5m
		};

		const stopPolling = () => {
			clearInterval(interval);
			interval = undefined;
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				// Don't bother if a fetch (from any source - mount, the
				// interval, or a previous rapid tab-switch) just happened.
				if (
					Date.now() - lastFetchAtRef.current >=
					MIN_VISIBILITY_REFETCH_MS
				) {
					fetchCurrentUser();
				}
				startPolling();
			} else {
				stopPolling();
			}
		};

		if (document.visibilityState === 'visible') startPolling();
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			stopPolling();
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange,
			);
		};
	}, []);

	const login = useGoogleLogin({
		flow: 'auth-code', // auth-code flow for backend verification
		scope: 'openid email profile',
		redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
		onSuccess: async (tokenResponse) => {
			// console.log(
			// 	'Raw tokenResponse from Google (auth-code):',
			// 	tokenResponse
			// );

			const authCode = tokenResponse.code; // frontend gets a code
			if (!authCode) {
				console.error('No auth code returned from Google');
				return;
			}

			try {
				const backendRes = await fetch('/api/auth/google', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code: authCode }),
				});

				const backendData = await backendRes.json();
				// console.log('Response from backend:', backendData);

				setUser(backendData.user);
			} catch (err) {
				console.error('Login process failed:', err);
			}
		},
		onError: (err) => {
			console.error('Google login failed:', err);
		},
	});

	const startEmulating = async (userId: number) => {
		const res = await fetch('/api/admin/emulate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ userId }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return body.error ?? 'Could not emulate that user';
		}
		await fetchCurrentUser();
		return null;
	};

	const stopEmulating = async () => {
		await fetch('/api/admin/emulate', {
			method: 'DELETE',
			credentials: 'include',
		});
		await fetchCurrentUser();
	};

	const logout = () => {
		googleLogout();
		setUser(null);
		setRealAdmin(false);
		setEmulating(false);

		fetch('/api/auth/logout', { method: 'POST' })
			.then(() => console.log('Backend session cleared'))
			.catch((err) =>
				console.error('Error clearing backend session:', err),
			);
	};

	return (
		<UserContext.Provider
			value={{
				user,
				setUser,
				login,
				logout,
				isLoading,
				realAdmin,
				emulating,
				startEmulating,
				stopEmulating,
				isLoginDialogOpen,
				openLoginDialog: () => setLoginDialogOpen(true),
				closeLoginDialog: () => setLoginDialogOpen(false),
			}}
		>
			{children}
		</UserContext.Provider>
	);
};
