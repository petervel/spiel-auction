import { useCallback, useState } from 'react';
import { useUser } from './useUser';

export const useCurrentFair = () => {
	const { user, setUser } = useUser();
	const [saving, setSaving] = useState(false);

	const switchFair = useCallback(
		async (fairId: number): Promise<boolean> => {
			if (!user) return false;

			setSaving(true);
			try {
				const res = await fetch('/api/user/currentFair', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ fairId }),
				});

				if (!res.ok) throw new Error('Failed to switch fair');

				const data = await res.json();
				setUser(data.user);
				return true;
			} catch (err) {
				console.error(err);
				return false;
			} finally {
				setSaving(false);
			}
		},
		[user, setUser]
	);

	return {
		currentFairId: user?.currentUserFair?.fairId,
		switchFair,
		saving,
	};
};
