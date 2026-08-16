import { Link } from '@mui/material';
import { useUser } from '../../hooks/useUser';
import css from './LoginLink.module.css';

// A "Log in" link that opens the shared login dialog, meant to be
// dropped inline into a sentence (e.g. "<LoginLink /> to see your items.").
export const LoginLink = () => {
	const { openLoginDialog } = useUser();

	return (
		<Link component="button" onClick={openLoginDialog} className={css.link}>
			Log in
		</Link>
	);
};
