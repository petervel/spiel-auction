import { useUser } from '../../hooks/useUser';

export const LoginPage = () => {
	const { user, login, logout } = useUser();

	return (
		<div>
			{user?.name}
			<div>
				{user ? (
					<button onClick={() => logout()}>Log out</button>
				) : (
					<button onClick={() => login()}>Log in</button>
				)}
			</div>
		</div>
	);
};

export default LoginPage;
