import { Alert } from '@mui/material';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

// Meetups still renders from whatever's cached (see sw.ts's api-cache),
// but edits (checking off, rescheduling, custom meetups) all hit
// non-GET routes the service worker doesn't intercept, so they'd just
// fail silently without this.
export const OfflineBanner = () => {
	const isOnline = useOnlineStatus();
	if (isOnline) return null;

	return (
		<Alert severity="warning" sx={{ borderRadius: '10px' }}>
			You're offline - changes won't save until you're back online.
		</Alert>
	);
};
