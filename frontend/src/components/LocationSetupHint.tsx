import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

const DISMISS_KEY = 'locationSetupHintDismissed';
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const readDismissedAt = (): number | null => {
	try {
		const raw = localStorage.getItem(DISMISS_KEY);
		if (raw === null) return null;
		const value = Number(JSON.parse(raw));
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
};

// Nudges logged-in users who haven't picked a meetup spot yet. Hidden for
// anyone who already has one, and dismissible for a week at a time.
export const LocationSetupHint = () => {
	const { user } = useUser();
	const [dismissed, setDismissed] = useState(() => {
		const dismissedAt = readDismissedAt();
		return dismissedAt !== null && Date.now() - dismissedAt < ONE_WEEK;
	});

	if (!user || user.currentUserFair?.locationSquare || dismissed) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(DISMISS_KEY, JSON.stringify(Date.now()));
		} catch {
			// Storage can be unavailable (private mode) - the hint just reappears.
		}
		setDismissed(true);
	};

	const message = !user.bggUsername ? (
		<>
			Add and verify your BGG username in{' '}
			<Link to="/settings">Settings</Link>, then pick your meetup spot on
			the trade floor so others can find you.
		</>
	) : !user.bggVerified ? (
		<>
			Verify your BGG username in <Link to="/settings">Settings</Link>,
			then pick your meetup spot so others can find you.
		</>
	) : (
		<>
			Pick your meetup spot on the{' '}
			<Link to="/settings/location">trade floor map</Link> so others can
			find you.
		</>
	);

	return (
		<Alert
			severity="info"
			sx={{ borderRadius: '10px' }}
			action={
				<IconButton
					aria-label="close"
					color="inherit"
					size="small"
					onClick={dismiss}
				>
					<CloseIcon fontSize="inherit" />
				</IconButton>
			}
		>
			{message}
		</Alert>
	);
};
