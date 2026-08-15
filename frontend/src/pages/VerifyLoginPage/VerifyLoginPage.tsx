import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { useUser } from '../../hooks/useUser';
import css from './VerifyLoginPage.module.css';

export const VerifyLoginPage = () => {
	const [searchParams] = useSearchParams();
	const { setUser } = useUser();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	// The verify request consumes a one-time token, so it must only ever be
	// sent once - a `cancelled`-on-cleanup guard isn't enough, since React
	// StrictMode's double-invoke would still fire two real requests and
	// could discard the one that actually succeeded.
	const startedRef = useRef(false);

	useEffect(() => {
		const token = searchParams.get('token');
		if (!token) {
			setError('This login link is missing its token.');
			return;
		}

		if (startedRef.current) return;
		startedRef.current = true;

		(async () => {
			try {
				const res = await fetch('/api/auth/magic-link/verify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ token }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error);

				setUser(data.user);
				navigate('/', { replace: true });
			} catch {
				setError(
					'This login link is invalid or has expired. Request a new one from the login menu.'
				);
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (error) {
		return (
			<Container>
				<div className={css.error}>{error}</div>
			</Container>
		);
	}

	return <Spinner />;
};
