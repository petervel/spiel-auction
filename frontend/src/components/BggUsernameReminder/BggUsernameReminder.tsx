import { Close } from '@mui/icons-material';
import { Button, IconButton, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router';
import useLocalStorage from '../../hooks/useLocalStorage';
import { useUser } from '../../hooks/useUser';

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const BggUsernameReminder = () => {
	const { user, isLoading } = useUser();
	const navigate = useNavigate();
	const [dismissedUntil, setDismissedUntil] = useLocalStorage<number | null>(
		'bggReminderDismissedUntil',
		null
	);

	const open =
		!isLoading &&
		!!user &&
		!user.bggUsername &&
		(!dismissedUntil || Date.now() > dismissedUntil);

	// Only an explicit dismiss starts the cooldown - navigating to Settings
	// without actually saving a username should still prompt again next visit.
	const dismiss = () => setDismissedUntil(Date.now() + DISMISS_MS);

	return (
		<Snackbar
			open={open}
			message="Set your BGG username to unlock Buying, Selling, and Outbid tracking."
			action={
				<>
					<Button
						color="inherit"
						size="small"
						onClick={() => navigate('/settings')}
					>
						Go to Settings
					</Button>
					<IconButton
						size="small"
						color="inherit"
						aria-label="Dismiss"
						onClick={dismiss}
					>
						<Close fontSize="small" />
					</IconButton>
				</>
			}
		/>
	);
};
