import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // <-- new
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	plugins: [
		react(),
		svgr(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: [
				'favicon.svg',
				'robots.txt',
				'apple-touch-icon.png',
				'icon/icon-192x192.png',
				'icon/icon-512x512.png',
			],
			injectRegister: 'auto',
			devOptions: {
				enabled: true,
			},
			manifest: {
				name: 'Spiel Auctions',
				short_name: 'Auctions',
				description:
					'This tool helps you manage your auctions for Essen Spiel',
				start_url: '/',
				display: 'standalone',
				background_color: '#0f5ba3',
				theme_color: '#0f5ba3',
				icons: [
					{
						src: '/icon/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/icon/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
				navigateFallback: '/index.html',
				runtimeCaching: [
					{
						urlPattern: ({ url }) =>
							url.pathname.startsWith('/api/'),
						handler: 'NetworkFirst', // try network first, fallback to cache
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 5, // fallback to cache if network slow
							fetchOptions: {
								credentials: 'include',
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
	server: {
		host: '0.0.0.0',
		port: 5173,
	},
	define: {
		'import.meta.env.VITE_DEFAULT_GEEKLIST_ID': JSON.stringify(
			process.env.VITE_DEFAULT_GEEKLIST_ID
		),
	},
});
