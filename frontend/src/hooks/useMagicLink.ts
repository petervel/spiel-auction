import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export const useMagicLink = () => {
	const [status, setStatus] = useState<Status>('idle');

	const requestLink = async (email: string) => {
		setStatus('sending');
		try {
			const res = await fetch('/api/auth/magic-link/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email }),
			});
			if (!res.ok) throw new Error('Failed to send login link');
			setStatus('sent');
		} catch (err) {
			console.error(err);
			setStatus('error');
		}
	};

	const reset = () => setStatus('idle');

	return { status, requestLink, reset };
};
