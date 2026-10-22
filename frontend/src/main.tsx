import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { UserProvider } from './providers/UserProvider.tsx';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// A browser only checks for a new service worker on navigation, throttled
// to ~once/24h once a check has succeeded - a PWA reopened from the home
// screen (rather than a fresh page load) can go a long time without that
// check ever firing. Checking periodically and whenever the app regains
// the foreground closes that gap. But *applying* a found update always
// means reloading the page - that's the only way to swap the JS already
// running underneath someone's open session - so that part waits for the
// tab to be backgrounded first, rather than firing mid-use the moment an
// update happens to land (registerType: 'prompt' in vite.config.ts, not
// 'autoUpdate', specifically to avoid that - autoUpdate's own generated
// code reloads unconditionally the instant any update activates).
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let updateReady = false;
const applyUpdate = registerSW({
	immediate: true,
	onNeedRefresh() {
		updateReady = true;
	},
	onRegisteredSW(_swUrl, registration) {
		if (!registration) return;
		setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				// Invisible from here - the tab isn't on screen, and by the
				// time it's reopened the reload has already happened.
				if (updateReady) void applyUpdate();
			} else {
				registration.update();
			}
		});
	},
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<GoogleOAuthProvider clientId={clientId}>
				<UserProvider>
					<App />
				</UserProvider>
			</GoogleOAuthProvider>
		</BrowserRouter>
	</StrictMode>
);
