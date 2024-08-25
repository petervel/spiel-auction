import { PaletteMode, useMediaQuery } from '@mui/material';
import { useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';

export function useDarkMode() {
	const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

	const [storedValue, setColourModeLocal] = useLocalStorage<PaletteMode>(
		'colourMode',
		systemPrefersDark ? 'dark' : 'light'
	);

	const [mode, setMode] = useState<PaletteMode>(storedValue);

	const toggleDarkMode = () => {
		const newValue = mode === 'light' ? 'dark' : 'light';
		setMode(newValue);
		setColourModeLocal(newValue);
	};

	useEffect(() => {
		if (mode == 'dark') {
			document.body.classList.add('dark');
		} else {
			document.body.classList.remove('dark');
		}
	}, [mode]);

	return {
		mode,
		toggleDarkMode,
	};
}
