import { ThemeProvider, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar/NavBar';
import { ColorModeContext } from './contexts/ColorModeContext';
import { useDarkMode } from './hooks/useDarkMode';
import { BuyingPage } from './pages/BidsPages/BuyingPage';
import { SellingPage } from './pages/BidsPages/SellingPage';
import { LatestPage } from './pages/LatestPage/LatestPage';
import { ObjectPage } from './pages/ObjectPage/ObjectPage';
import SettingsPage from './pages/Settings';

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
					<NavBar />
					<div className="content-max-width">
						<Routes>
							<Route path="/" element={<LatestPage />} />
							<Route
								path="/object/:objectId"
								element={<ObjectPage />}
							/>
							<Route path="/buying" element={<BuyingPage />} />
							<Route
								path="/buying/:username"
								element={<BuyingPage />}
							/>
							<Route path="/selling" element={<SellingPage />} />
							<Route
								path="/selling/:username"
								element={<SellingPage />}
							/>
							<Route
								path="/settings"
								element={<SettingsPage />}
							/>
							{/* <Route path="/duplicates" element={<Duplicates />} /> */}
						</Routes>
					</div>
				</ThemeProvider>
			</ColorModeContext.Provider>
		</QueryClientProvider>
	);
}

export default App;
