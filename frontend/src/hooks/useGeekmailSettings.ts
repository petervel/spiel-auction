import { useCallback, useState } from 'react';
import { MeetupDay } from './useMeetups';
import { useUser } from './useUser';

export const DEFAULT_SELLER_MESSAGE_TEMPLATE = `Hi [buyer],

Congrats on winning the auction(s) for [game] for [amount]!

I would prefer to meet on [day] at [location]. Please let me know if that's okay for you.
See you in Essen!

[name]`;

export const DEFAULT_BUYER_MESSAGE_TEMPLATE = `Hi [seller],

I'm happy I won the auction for [game] for [amount]. Is it possible for you to meet up on [day] at [location] to make the exchange?

Best regards,
[name]`;

export type GeekmailSettings = {
	preferredTradeDays: MeetupDay[];
	sellerMessageTemplate: string;
	buyerMessageTemplate: string;
};

export const useGeekmailSettings = () => {
	const { user, setUser } = useUser();
	const [saving, setSaving] = useState(false);

	const settings: GeekmailSettings = {
		preferredTradeDays: user?.preferredTradeDays ?? [],
		sellerMessageTemplate:
			user?.sellerMessageTemplate ?? DEFAULT_SELLER_MESSAGE_TEMPLATE,
		buyerMessageTemplate:
			user?.buyerMessageTemplate ?? DEFAULT_BUYER_MESSAGE_TEMPLATE,
	};

	const setSettings = useCallback(
		async (next: GeekmailSettings) => {
			if (!user) return;

			setSaving(true);
			try {
				const res = await fetch('/api/user/geekmailSettings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(next),
				});

				if (!res.ok)
					throw new Error('Failed to update geekmail settings');

				setUser({ ...user, ...next });
			} catch (err) {
				console.error(err);
			} finally {
				setSaving(false);
			}
		},
		[user, setUser]
	);

	return { settings, setSettings, saving };
};
