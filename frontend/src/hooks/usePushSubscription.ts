import { useCallback, useEffect, useState } from 'react';
import { urlBase64ToUint8Array } from '../util';

const supported =
	typeof window !== 'undefined' &&
	'serviceWorker' in navigator &&
	'PushManager' in window;

// iOS Safari only exposes push notifications to a site that's been added
// to the home screen (since iOS 16.4) - a regular browser tab can't
// subscribe at all, unlike Android where it just works. `standalone` is
// iOS's own flag for "running as an installed home-screen app."
const isIos =
	typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone =
	typeof navigator !== 'undefined' &&
	(navigator as unknown as { standalone?: boolean }).standalone === true;
const needsHomeScreenInstall = isIos && !isStandalone;

export const usePushSubscription = () => {
	const [permission, setPermission] = useState<NotificationPermission>(
		supported ? Notification.permission : 'denied'
	);
	const [subscribed, setSubscribed] = useState(false);
	const [saving, setSaving] = useState(false);
	const [testSending, setTestSending] = useState(false);

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

	const sendTest = useCallback(async () => {
		setTestSending(true);
		try {
			const res = await fetch('/api/push/test', {
				method: 'POST',
				credentials: 'include',
			});
			return res.ok;
		} catch (err) {
			console.error(err);
			return false;
		} finally {
			setTestSending(false);
		}
	}, []);

	return {
		supported,
		needsHomeScreenInstall,
		permission,
		subscribed,
		saving,
		subscribe,
		unsubscribe,
		testSending,
		sendTest,
	};
};
