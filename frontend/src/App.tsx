import { ThemeProvider, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppRouter } from './AppRouter';
import { DonateHint } from './components/DonateHint';
import { NavBar } from './components/NavBar/NavBar';
import { ColorModeContext } from './contexts/ColorModeContext';
import { useDarkMode } from './hooks/useDarkMode';
import { BookmarkProvider } from './providers/BookmarkProvider';

function App() {
	const { mode, toggleDarkMode } = useDarkMode();

	const theme = useMemo(() => {
		return createTheme({
			palette: {
				mode,
			},
		});
	}, [mode]);

	const queryClient = new QueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ColorModeContext.Provider value={{ mode, toggleDarkMode }}>
				<ThemeProvider theme={theme}>
					<BookmarkProvider>
						<NavBar />
						<DonateHint />
						<div className="content-max-width">
							<AppRouter />
						</div>
					</BookmarkProvider>
				</ThemeProvider>
			</ColorModeContext.Provider>
		</QueryClientProvider>
	);
}

export default App;
