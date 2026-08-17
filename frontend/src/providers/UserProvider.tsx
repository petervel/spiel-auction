import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { User } from '../model/User';

const MIN_VISIBILITY_REFETCH_MS = 30_000;

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setLoading] = useState(true);
	const [isLoginDialogOpen, setLoginDialogOpen] = useState(false);
	const lastFetchAtRef = useRef(0);

	const fetchCurrentUser = async () => {
		lastFetchAtRef.current = Date.now();
		try {
			const res = await fetch('/api/auth/me', {
				credentials: 'include',
			}); // include cookie!
			if (res.ok) {
				const data = await res.json();
				// console.log('Fetched current user:', data);
				setUser(data.user ?? null);
			} else {
				setUser(null);
			}
		} catch (err) {
			console.error('Failed to fetch current user:', err);
			setUser(null);
		} finally {
			setLoading(false);
		}
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
				handleVisibilityChange
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

	const logout = () => {
		googleLogout();
		setUser(null);

		fetch('/api/auth/logout', { method: 'POST' })
			.then(() => console.log('Backend session cleared'))
			.catch((err) =>
				console.error('Error clearing backend session:', err)
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
				isLoginDialogOpen,
				openLoginDialog: () => setLoginDialogOpen(true),
				closeLoginDialog: () => setLoginDialogOpen(false),
			}}
		>
			{children}
		</UserContext.Provider>
	);
};
