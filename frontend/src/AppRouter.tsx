import { Routes, Route } from 'react-router-dom';
import TabLayout from './layouts/TabLayout';
import { BuyingPage } from './pages/BidsPages/BuyingPage';
import { SellingPage } from './pages/BidsPages/SellingPage';
import { DeletedPage } from './pages/DeletedPage/DeletedPage';
import { DonatePage } from './pages/DonatePage/DonatePage';
import { DuplicatesPage } from './pages/DuplicatesPage/DuplicatesPage';
import { ExportPage } from './pages/ExportPage/ExportPage';
import { ImportWishlistPage } from './pages/ImportWishlistPage/ImportWishlistPage';
import { ItemPage } from './pages/ItemPage/ItemPage';
import { LatestPage } from './pages/LatestPage/LatestPage';
import { LikedPage } from './pages/LatestPage/LikedPage';
import { ObjectPage } from './pages/ObjectPage/ObjectPage';
import { SearchPage } from './pages/SearchPage/SearchPage';
import { SettingsPage } from './pages/SettingsPage/SettingsPage';
import { VerifyLoginPage } from './pages/VerifyLoginPage/VerifyLoginPage';
import { WishlistPage } from './pages/WishlistPage/WishlistPage';

export const AppRouter = () => {
	return (
		<Routes>
			<Route element={<TabLayout />}>
				<Route path="/" element={<LatestPage />} />
				<Route path="/object/:objectId" element={<ObjectPage />} />
				<Route path="/item/:itemId" element={<ItemPage />} />
				<Route path="/buying/:username?" element={<BuyingPage />} />
				<Route path="/selling/:username?" element={<SellingPage />} />
				<Route path="/search" element={<SearchPage />} />
				<Route path="/liked" element={<LikedPage />} />
				<Route path="/wishlist" element={<WishlistPage />} />
			</Route>

			<Route path="/login/verify" element={<VerifyLoginPage />} />
			<Route path="/settings" element={<SettingsPage />} />
			<Route path="/duplicates" element={<DuplicatesPage />} />
			<Route path="/deleted" element={<DeletedPage />} />
			<Route path="/export" element={<ExportPage />} />
			<Route path="/donate" element={<DonatePage />} />
			<Route path="/wishlist/import" element={<ImportWishlistPage />} />
		</Routes>
	);
};
