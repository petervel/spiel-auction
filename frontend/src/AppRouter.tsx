import { Routes, Route } from 'react-router-dom';
import TabLayout from './layouts/TabLayout';
import { BuyingPage } from './pages/BidsPages/BuyingPage';
import { SellingPage } from './pages/BidsPages/SellingPage';
import { DeletedPage } from './pages/DeletedPage/DeletedPage';
import { DonatePage } from './pages/DonatePage/DonatePage';
import { DuplicatesPage } from './pages/DuplicatesPage/DuplicatesPage';
import { ExportPage } from './pages/ExportPage/ExportPage';
import { LatestPage } from './pages/LatestPage/LatestPage';
import { StarredPage } from './pages/LatestPage/StarredPage';
import { ObjectPage } from './pages/ObjectPage/ObjectPage';
import { SearchPage } from './pages/SearchPage/SearchPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { VerifyLoginPage } from './pages/VerifyLoginPage/VerifyLoginPage';

export const AppRouter = () => {
	return (
		<Routes>
			<Route element={<TabLayout />}>
				<Route path="/" element={<LatestPage />} />
				<Route path="/object/:objectId" element={<ObjectPage />} />
				<Route path="/buying/:username?" element={<BuyingPage />} />
				<Route path="/selling/:username?" element={<SellingPage />} />
				<Route path="/search" element={<SearchPage />} />
				<Route path="/starred" element={<StarredPage />} />
			</Route>

			<Route path="/login/verify" element={<VerifyLoginPage />} />
			<Route path="/settings" element={<SettingsPage />} />
			<Route path="/duplicates" element={<DuplicatesPage />} />
			<Route path="/deleted" element={<DeletedPage />} />
			<Route path="/export" element={<ExportPage />} />
			<Route path="/donate" element={<DonatePage />} />
		</Routes>
	);
};
