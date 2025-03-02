import {
	googleLogout,
	TokenResponse,
	useGoogleLogin,
} from '@react-oauth/google';
import { useState } from 'react';

export const LoginPage = () => {
	const [userToken, setUserToken] = useState<string | null>(null);

	const onSuccess = (token: TokenResponse) => {
		setUserToken(token.access_token);
	};

	const onError = () => {
		console.log('Error logging in');
	};

	const logIn = useGoogleLogin({
		onSuccess,
		onError,
	});

	const logOut = () => {
		googleLogout();
		setUserToken(null);
	};

	return (
		<div>
			{userToken}
			<div>
				{userToken ? (
					<button onClick={() => logOut()}>Log out</button>
				) : (
					<button onClick={() => logIn()}>Log in</button>
				)}
			</div>
		</div>
	);
};

export default LoginPage;
