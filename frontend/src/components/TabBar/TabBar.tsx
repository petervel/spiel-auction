import { Button, Stack, Tooltip } from '@mui/material';
import classNames from 'classnames';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTabPages } from '../../hooks/useTabPages';
import css from './TabBar.module.css';

type IndicatorRect = { left: number; width: number };

export const TabBar = () => {
	const { pages, pageId, activeIndex } = useTabPages();
	const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
	const [indicator, setIndicator] = useState<IndicatorRect | null>(null);

	// Re-measure the active tab's actual box (not just its icon) whenever it
	// changes or the window resizes, so the indicator can slide/resize to
	// match it - tabs aren't fixed-width, so this can't be computed from CSS
	// alone.
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
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, [activeIndex]);

	return (
		<Stack
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
				const button = (
					<Tooltip title={pageData.label} key={pageData.id}>
						<Button
							className={classNames(css.button, {
								[css.active]: pageData.id === pageId,
								[css.disabled]: pageData.disabled,
							})}
							sx={{ minWidth: '50px' }}
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
