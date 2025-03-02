import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export const LoginPage = () => {
	const onSuccess = (response: CredentialResponse) => {
		console.log(response);
		if (response.credential) {
			const decoded = jwtDecode(response.credential);
			console.log(decoded);
		}
	};

	const onError = () => {
		console.log('Error');
	};

	return <GoogleLogin onSuccess={onSuccess} onError={onError} />;
};

export default LoginPage;
