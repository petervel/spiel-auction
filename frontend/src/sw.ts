/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

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
	const data = event.data?.json() ?? {};
	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Spiel Auction', {
			body: data.body,
			icon: '/icon/icon-192x192.png',
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
