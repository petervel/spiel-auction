import { createContext } from 'react';

export const ColorModeContext = createContext({
	mode: 'light',
	toggleDarkMode: () => {
		console.log('toggleDarkMode not implemented.');
	},
});
