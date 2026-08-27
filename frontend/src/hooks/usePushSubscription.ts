import { useCallback, useEffect, useState } from 'react';
import { urlBase64ToUint8Array } from '../util';

const supported =
	typeof window !== 'undefined' &&
	'serviceWorker' in navigator &&
	'PushManager' in window;

export const usePushSubscription = () => {
	const [permission, setPermission] = useState<NotificationPermission>(
		supported ? Notification.permission : 'denied'
	);
	const [subscribed, setSubscribed] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!supported) return;
		navigator.serviceWorker.ready
			.then((registration) => registration.pushManager.getSubscription())
			.then((subscription) => setSubscribed(!!subscription));
	}, []);

	const subscribe = useCallback(async () => {
		if (!supported) return;

		setSaving(true);
		try {
			const result = await Notification.requestPermission();
			setPermission(result);
			if (result !== 'granted') return;

			const registration = await navigator.serviceWorker.ready;

			const { publicKey } = await fetch('/api/push/vapidPublicKey').then(
				(res) => res.json()
			);

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey),
			});

			const { endpoint, keys } = subscription.toJSON();
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ endpoint, keys }),
			});
			if (!res.ok) throw new Error('Failed to save push subscription');

			setSubscribed(true);
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	}, []);

	const unsubscribe = useCallback(async () => {
		if (!supported) return;

		setSaving(true);
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription =
				await registration.pushManager.getSubscription();
			if (!subscription) {
				setSubscribed(false);
				return;
			}

			const { endpoint } = subscription.toJSON();
			await subscription.unsubscribe();

			await fetch('/api/push/unsubscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ endpoint }),
			});

			setSubscribed(false);
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	}, []);

	return { supported, permission, subscribed, saving, subscribe, unsubscribe };
};
