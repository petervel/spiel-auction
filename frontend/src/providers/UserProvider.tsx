import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { ReactNode, useEffect, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { User } from '../model/User';

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setLoading] = useState(true);

	const fetchCurrentUser = async () => {
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
		// fetch once on mount
		fetchCurrentUser();

		// 🔄 periodic sync
		const interval = setInterval(fetchCurrentUser, 300_000); // every 5m
		return () => clearInterval(interval);
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
			value={{ user, setUser, login, logout, isLoading }}
		>
			{children}
		</UserContext.Provider>
	);
};
