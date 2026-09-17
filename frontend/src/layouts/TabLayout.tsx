import { useMediaQuery } from '@mui/material';
import { TouchEvent, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TabBar } from '../components/TabBar/TabBar';
import { useTabPages } from '../hooks/useTabPages';
import { getSwipeDirection } from '../util';
import css from './TabLayout.module.css';

export default function TabLayout() {
	const { pages, activeIndex } = useTabPages();
	const navigate = useNavigate();
	// Same breakpoint AuctionItem.tsx uses for its own mobile/desktop split -
	// swipe-to-change-tab is a mobile-only affordance.
	const isDesktop = useMediaQuery('(min-width:768px)');
	const touchStart = useRef<{ x: number; y: number } | null>(null);

	// activeIndex is -1 on a non-tab page (e.g. an object/item detail page) -
	// swiping/arrow-key navigation shouldn't jump to some other tab there.
	const swipeEnabled = !isDesktop && activeIndex !== -1;

	// Left/right arrow keys move between tabs, same as swiping - not gated
	// to mobile, since a keyboard is a desktop-shaped input to begin with.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (activeIndex === -1) return;
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}

			// Don't hijack arrow keys while editing text (e.g. moving the
			// cursor in the search field).
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === 'INPUT' ||
					target.tagName === 'TEXTAREA' ||
					target.isContentEditable)
			) {
				return;
			}

			if (event.key === 'ArrowRight' && activeIndex < pages.length - 1) {
				navigate(pages[activeIndex + 1].url);
			} else if (event.key === 'ArrowLeft' && activeIndex > 0) {
				navigate(pages[activeIndex - 1].url);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [activeIndex, pages, navigate]);

	const handleTouchStart = (evt: TouchEvent) => {
		if (!swipeEnabled) return;
		const touch = evt.touches[0];
		touchStart.current = { x: touch.clientX, y: touch.clientY };
	};

	const handleTouchEnd = (evt: TouchEvent) => {
		const start = touchStart.current;
		touchStart.current = null;
		if (!swipeEnabled || !start) return;

		const touch = evt.changedTouches[0];
		const direction = getSwipeDirection(
			touch.clientX - start.x,
			touch.clientY - start.y
		);

		if (direction === 'left' && activeIndex < pages.length - 1) {
			navigate(pages[activeIndex + 1].url);
		} else if (direction === 'right' && activeIndex > 0) {
			navigate(pages[activeIndex - 1].url);
		}
	};

	return (
		<>
			<TabBar />
			<div
				className={css.content}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
			>
				<Outlet />
			</div>
		</>
	);
}
