import { ThemeProvider, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar/NavBar';
import { ColorModeContext } from './contexts/ColorModeContext';
import { useDarkMode } from './hooks/useDarkMode';
import LatestPage from './pages/LatestPage/LatestPage';
import ObjectPage from './pages/ObjectPage/ObjectPage';

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
							{/* <Route path="/selling" element={<Selling />} />
							<Route
								path="/selling/:username"
								element={<Selling />}
							/>
							<Route path="/buying" element={<Buying />} />
							<Route
								path="/buying/:username"
								element={<Buying />}
							/>
							<Route
								path="/sorted/:letter"
								element={<Sorted />}
							/> */}
							{/* <Route path="/settings" element={<Settings />} /> */}
							{/* <Route path="/duplicates" element={<Duplicates />} /> */}
						</Routes>
					</div>
				</ThemeProvider>
			</ColorModeContext.Provider>
		</QueryClientProvider>
	);
}

export default App;
