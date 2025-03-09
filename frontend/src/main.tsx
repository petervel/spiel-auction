import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { UserProvider } from './providers/UserProvider.tsx';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

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
