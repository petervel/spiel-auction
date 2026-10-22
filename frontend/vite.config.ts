import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // <-- new
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// loadEnv reads frontend/.env.local (dev) merged with any matching
	// process.env vars (prod Docker build's `RUN VITE_X=... yarn build`),
	// with process.env taking precedence - unlike reading process.env
	// directly, this doesn't go blank in dev.
	const env = loadEnv(mode, process.cwd());

	return {
		base: '/',
		plugins: [
			react(),
			svgr(),
			VitePWA({
				// generateSW (the default) can't add push/notificationclick
				// listeners - injectManifest hands the whole service worker
				// over to our own source file instead (src/sw.ts), which has
				// to reimplement precaching/navigation fallback/runtime
				// caching by hand (see the `workbox` block below, which has
				// no effect in this mode).
				strategies: 'injectManifest',
				srcDir: 'src',
				filename: 'sw.ts',
				// 'prompt', not 'autoUpdate' - autoUpdate's generated register
				// code reloads the page the instant any new SW activates, no
				// matter what's on screen. main.tsx decides when that's safe
				// (only once the tab's backgrounded) instead.
				registerType: 'prompt',
				includeAssets: [
					'favicon.svg',
					'robots.txt',
					'apple-touch-icon.png',
					'icon/icon-192x192.png',
					'icon/icon-512x512.png',
				],
				// Registered by hand in main.tsx instead (via
				// virtual:pwa-register) so it can also poll for updates -
				// the browser's own update check only fires on navigation,
				// throttled to ~once/24h, which a phone PWA that's rarely
				// fully closed/reloaded can go a long time without hitting.
				injectRegister: false,
				devOptions: {
					enabled: true,
					type: 'module',
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
				injectManifest: {
					globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
				},
			}),
		],
		server: {
			host: '0.0.0.0',
			port: 5173,
			hmr: { clientPort: 8081 },
		},
		define: {
			'import.meta.env.VITE_DEFAULT_GEEKLIST_ID': JSON.stringify(
				env.VITE_DEFAULT_GEEKLIST_ID
			),
			'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
				env.VITE_GOOGLE_CLIENT_ID
			),
			'import.meta.env.VITE_GOOGLE_REDIRECT_URI': JSON.stringify(
				env.VITE_GOOGLE_REDIRECT_URI
			),
		},
	};
});
