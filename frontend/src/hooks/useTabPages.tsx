import {
	HeartBrokenRounded,
	Sell,
	ShoppingBasket,
	StarRounded,
	WatchLaterRounded,
} from '@mui/icons-material';
import { ReactNode } from 'react';
import { useBggUsername } from './useBggUsername';
import { usePageId } from './usePageId';

export type TabPageId =
	| 'latest'
	| 'search'
	| 'selling'
	| 'buying'
	| 'wishlist'
	| 'liked';

export type TabPageData = {
	id: TabPageId;
	label: string;
	renderIcon: () => ReactNode;
	url: string;
	disabled?: boolean;
};

// The tab bar's own ordered list of pages - shared with TabLayout so swipe
// navigation moves to the next/previous tab using the exact same order and
// URLs the tab buttons themselves link to, rather than a second copy of
// this list drifting out of sync with it.
export const useTabPages = () => {
	const pageId = usePageId();
	const { bggUsername } = useBggUsername();

	const pages: TabPageData[] = [
		{
			id: 'latest',
			label: 'Latest',
			renderIcon: () => <WatchLaterRounded />,
			url: '/',
		},
		// {
		// 	id: 'search',
		// 	label: 'Search',
		// 	disabled: true,
		// 	renderIcon: () => <Search />,
		// 	url: `/search`,
		// },
		{
			id: 'selling',
			label: 'Selling',
			renderIcon: () => <Sell />,
			url: `/selling${bggUsername ? `/${bggUsername}` : ''}`,
		},
		{
			id: 'buying',
			label: 'Buying',
			renderIcon: () => <ShoppingBasket />,
			url: `/buying${bggUsername ? `/${bggUsername}` : ''}`,
		},
		{
			id: 'liked',
			label: 'Outbid & Liked',
			renderIcon: () => <HeartBrokenRounded />,
			url: `/liked`,
		},
		{
			id: 'wishlist',
			label: 'Wishlist',
			renderIcon: () => <StarRounded />,
			url: `/wishlist`,
		},
	];

	// -1 while viewing a non-tab page (e.g. an object/item detail page) -
	// callers should treat that as "no active tab" rather than clamping it.
	const activeIndex = pages.findIndex((p) => p.id === pageId);

	return { pages, pageId, activeIndex };
};
