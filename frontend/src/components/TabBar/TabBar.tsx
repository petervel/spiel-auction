import { Button, Stack, Tooltip } from '@mui/material';
import classNames from 'classnames';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTabPages } from '../../hooks/useTabPages';
import css from './TabBar.module.css';

type IndicatorRect = { left: number; width: number };

export const TabBar = () => {
	const { pages, pageId, activeIndex } = useTabPages();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
	const [indicator, setIndicator] = useState<IndicatorRect | null>(null);

	// Re-measure the active tab's actual box (not just its icon) whenever it
	// changes or the row itself resizes, so the indicator can slide/resize
	// to match it - tabs aren't fixed-width, so this can't be computed from
	// CSS alone.
	useLayoutEffect(() => {
		const measure = () => {
			const activeLink = linkRefs.current[activeIndex];
			if (activeLink) {
				setIndicator({
					left: activeLink.offsetLeft,
					width: activeLink.offsetWidth,
				});
			}
		};

		measure();

		// A window "resize" event isn't the only thing that can move this
		// centered row after the first measurement - the page content below
		// the tab bar (Outlet in TabLayout) loads asynchronously, and once
		// it's tall enough to grow a scrollbar, the shrunk available width
		// re-centers this row without the window's own size ever changing.
		// That's why the indicator used to land in the wrong place on load
		// but self-correct on the next tab switch (which re-measures anyway)
		// - observing the container itself catches that shift too, whatever
		// caused it.
		const container = containerRef.current;
		const resizeObserver = container ? new ResizeObserver(measure) : null;
		if (container && resizeObserver) resizeObserver.observe(container);

		window.addEventListener('resize', measure);
		return () => {
			window.removeEventListener('resize', measure);
			resizeObserver?.disconnect();
		};
	}, [activeIndex]);

	return (
		<Stack
			ref={containerRef}
			direction="row"
			spacing={1}
			marginBlock={3}
			marginBottom={3}
			justifyContent="center"
			className={css.tabBar}
		>
			{indicator && (
				<div
					className={css.indicator}
					style={{ left: indicator.left, width: indicator.width }}
				/>
			)}
			{pages.map((pageData, index) => {
				const isActive = pageData.id === pageId;
				const button = (
					<Tooltip title={pageData.label} key={pageData.id}>
						<Button
							className={classNames(css.button, {
								[css.active]: isActive,
								[css.disabled]: pageData.disabled,
							})}
							sx={{
								minWidth: '50px',
								color: isActive
									? 'var(--colour-on-main)'
									: 'var(--colour-inactive)',
							}}
							aria-label={pageData.label}
							disabled={pageData.disabled}
						>
							<Stack alignItems="center" gap={1} padding={1}>
								{pageData.renderIcon()}
							</Stack>
						</Button>
					</Tooltip>
				);

				return pageData.disabled ? (
					button
				) : (
					<Link
						ref={(el) => {
							linkRefs.current[index] = el;
						}}
						to={pageData.url}
						key={pageData.id}
						style={{ textDecoration: 'none' }}
					>
						{button}
					</Link>
				);
			})}
		</Stack>
	);
};
