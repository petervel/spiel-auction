import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	plugins: [react(), svgr()],
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
