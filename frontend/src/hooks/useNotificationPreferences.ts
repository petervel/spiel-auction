import { useCallback, useState } from 'react';
import { useUser } from './useUser';

export type NotificationPreferences = {
	notifyOnOutbid: boolean;
	notifyOnNewBid: boolean;
	notifyOnAuctionWon: boolean;
};

export const useNotificationPreferences = () => {
	const { user, setUser } = useUser();
	const [saving, setSaving] = useState(false);

	const preferences: NotificationPreferences = {
		notifyOnOutbid: user?.notifyOnOutbid ?? true,
		notifyOnNewBid: user?.notifyOnNewBid ?? true,
		notifyOnAuctionWon: user?.notifyOnAuctionWon ?? true,
	};

	const setPreferences = useCallback(
		async (next: NotificationPreferences) => {
			if (!user) return;

			setSaving(true);
			try {
				const res = await fetch('/api/user/notificationPreferences', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(next),
				});

				if (!res.ok)
					throw new Error('Failed to update notification preferences');

				setUser({ ...user, ...next });
			} catch (err) {
				console.error(err);
			} finally {
				setSaving(false);
			}
		},
		[user, setUser]
	);

	return { preferences, setPreferences, saving };
};
