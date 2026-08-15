import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	TextField,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { useMagicLink } from '../../hooks/useMagicLink';
import { useUser } from '../../hooks/useUser';
import css from './LoginDialog.module.css';

type LoginDialogProps = {
	open: boolean;
	onClose: () => void;
};

export const LoginDialog = ({ open, onClose }: LoginDialogProps) => {
	const { login } = useUser();
	const { status, requestLink, reset } = useMagicLink();
	const [email, setEmail] = useState('');

	const handleClose = () => {
		reset();
		setEmail('');
		onClose();
	};

	const handleGoogleLogin = () => {
		login();
		handleClose();
	};

	const handleEmailSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (!email.trim()) return;
		requestLink(email.trim());
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
			<DialogTitle>Log in</DialogTitle>
			<DialogContent className={css.content}>
				<Button
					variant="outlined"
					fullWidth
					onClick={handleGoogleLogin}
				>
					Continue with Google
				</Button>

				<Divider className={css.divider}>or</Divider>

				{status === 'sent' ? (
					<p className={css.sentMessage}>
						Check your inbox at <strong>{email}</strong> for a
						login link. It's valid for 15 minutes.
					</p>
				) : (
					<form
						onSubmit={handleEmailSubmit}
						className={css.emailForm}
					>
						<TextField
							type="email"
							label="Email address"
							required
							fullWidth
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							disabled={status === 'sending'}
						/>
						<Button
							type="submit"
							variant="contained"
							fullWidth
							disabled={status === 'sending'}
						>
							{status === 'sending'
								? 'Sending...'
								: 'Email me a login link'}
						</Button>
						{status === 'error' && (
							<p className={css.error}>
								Something went wrong sending the link. Try
								again.
							</p>
						)}
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
};
