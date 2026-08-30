/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// TypeScript's bundled webworker lib doesn't define this event type at all
// - declared by hand rather than pulling in a separate @types package for
// one interface.
interface PushSubscriptionChangeEvent extends ExtendableEvent {
	readonly newSubscription: PushSubscription | null;
	readonly oldSubscription: PushSubscription | null;
}

// Duplicated from src/util.ts rather than imported - keeps this bundle
// self-contained rather than pulling in the rest of the app's utility
// module into the service worker.
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, '+')
		.replace(/_/g, '/');

	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

// injectManifest replaces this exact token at build time via a literal
// string match, so it has to appear exactly once in this file - captured
// into a variable rather than referenced a second time below.
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);

// In dev, vite-plugin-pwa's dev-sw wrapper stubs this as an empty array
// (nothing is actually precached) - createHandlerBoundToURL needs its
// target to be a real precache entry, so it throws and crashes the whole
// SW script if this runs against an empty manifest.
if (manifest.length > 0) {
	registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
}

registerRoute(
	({ url }) => url.pathname.startsWith('/api/'),
	new NetworkFirst({
		cacheName: 'api-cache',
		networkTimeoutSeconds: 5,
		fetchOptions: { credentials: 'include' },
		plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
	})
);

self.addEventListener('push', (event) => {
	// A payload that isn't valid JSON (e.g. DevTools' "Push" test button,
	// which just sends plain text) shouldn't crash the whole handler and
	// silently show nothing - fall back to treating it as a plain body.
	let data: { title?: string; body?: string; url?: string; icon?: string } =
		{};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { body: event.data?.text() };
	}

	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Spiel Auction', {
			body: data.body,
			icon: data.icon ?? '/icon/icon-192x192.png',
			data: { url: data.url ?? '/' },
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		self.clients.openWindow(event.notification.data?.url ?? '/')
	);
});

// Browsers can silently rotate a subscription (e.g. Chrome/FCM key
// refreshes) before the old one dies, rather than just letting it go
// stale - without this, the user would only find out once a send fails
// server-side and their row gets cleaned up, i.e. notifications would
// just quietly stop until they revisit Settings.
self.addEventListener('pushsubscriptionchange', (event) => {
	const changeEvent = event as PushSubscriptionChangeEvent;
	changeEvent.waitUntil(
		(async () => {
			let subscription = changeEvent.newSubscription;
			if (!subscription) {
				const applicationServerKey =
					changeEvent.oldSubscription?.options.applicationServerKey ??
					urlBase64ToUint8Array(
						(
							await fetch('/api/push/vapidPublicKey').then((res) =>
								res.json()
							)
						).publicKey
					);
				subscription = await self.registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey,
				});
			}

			const { endpoint, keys } = subscription.toJSON();
			await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ endpoint, keys }),
			});
		})()
	);
});
