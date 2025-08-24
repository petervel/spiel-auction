import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { ReactNode, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { User } from '../model/user';

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);

	const login = useGoogleLogin({
		flow: 'auth-code', // auth-code flow for backend verification
		scope: 'openid email profile',
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
		<UserContext.Provider value={{ user, login, logout }}>
			{children}
		</UserContext.Provider>
	);
};
