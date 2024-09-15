import { ThemeProvider, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar/NavBar';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ColorModeContext } from './contexts/ColorModeContext';
import { useDarkMode } from './hooks/useDarkMode';
import { BuyingPage } from './pages/BidsPages/BuyingPage';
import { OutbidsPage } from './pages/BidsPages/OutbidsPage';
import { SellingPage } from './pages/BidsPages/SellingPage';
import { DeletedPage } from './pages/DeletedPage/DeletedPage';
import { DuplicatesPage } from './pages/DuplicatesPage/DuplicatesPage';
import { LatestPage } from './pages/LatestPage/LatestPage';
import { ObjectPage } from './pages/ObjectPage/ObjectPage';
import { SearchPage } from './pages/SearchPage/SearchPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';

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
						<div className="content-max-width">
							<Routes>
								<Route path="/" element={<LatestPage />} />
								<Route
									path="/object/:objectId"
									element={<ObjectPage />}
								/>
								<Route
									path="/buying"
									element={<BuyingPage />}
								/>
								<Route
									path="/buying/:username"
									element={<BuyingPage />}
								/>
								<Route
									path="/outbids"
									element={<OutbidsPage />}
								/>
								<Route
									path="/outbids/:username"
									element={<OutbidsPage />}
								/>
								<Route
									path="/selling"
									element={<SellingPage />}
								/>
								<Route
									path="/selling/:username"
									element={<SellingPage />}
								/>
								<Route
									path="/settings"
									element={<SettingsPage />}
								/>
								<Route
									path="/duplicates"
									element={<DuplicatesPage />}
								/>
								<Route
									path="/deleted"
									element={<DeletedPage />}
								/>

								<Route
									path="/search"
									element={<SearchPage />}
								/>
							</Routes>
						</div>
					</BookmarkProvider>
				</ThemeProvider>
			</ColorModeContext.Provider>
		</QueryClientProvider>
	);
}

export default App;
