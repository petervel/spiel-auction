import {
	googleLogout,
	TokenResponse,
	useGoogleLogin,
} from '@react-oauth/google';
import { ReactNode, useState } from 'react';
import { UserContext } from '../contexts/UserContext';

interface User {
	name: string;
	email: string;
	picture: string;
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);

	const login = useGoogleLogin({
		onSuccess: async (tokenResponse: TokenResponse) => {
			const userInfo = await fetch(
				'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
				{
					headers: {
						Authorization: `Bearer ${tokenResponse.access_token}`,
					},
				}
			).then((res) => res.json());

			setUser({
				name: userInfo.name,
				email: userInfo.email,
				picture: userInfo.picture,
			});
		},
		onError: () => {
			console.error('Login failed');
		},
	});

	const logout = () => {
		googleLogout();
		setUser(null);
	};

	return (
		<UserContext.Provider value={{ user, login, logout }}>
			{children}
		</UserContext.Provider>
	);
};
