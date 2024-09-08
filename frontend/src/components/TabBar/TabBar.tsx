import { Schedule, Sell, ShoppingBasket } from '@mui/icons-material';
import { Button, Stack } from '@mui/material';
import classNames from 'classnames';
import { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useBggUsername } from '../../hooks/useBggUsername';
import { usePageId } from '../../hooks/usePageId';
import css from './TabBar.module.css';

type PageData = {
	id: 'latest' | 'search' | 'selling' | 'buying' | 'starred';
	label: string;
	renderIcon: () => ReactNode;
	url: string;
	disabled?: boolean;
};

export const TabBar = () => {
	const pageId = usePageId();
	const username = useBggUsername();

	const pages: PageData[] = [
		{
			id: 'latest',
			label: 'Latest',
			renderIcon: () => <Schedule />,
			url: '/',
		},
		// {
		// 	id: 'search',
		// 	label: 'Search',
		// 	renderIcon: () => <Search />,
		// 	url: `/search`,
		// },
		{
			id: 'selling',
			label: 'Selling',
			renderIcon: () => <Sell />,
			url: `/selling${username ? `/${username}` : ''}`,
		},
		{
			id: 'buying',
			label: 'Buying',
			renderIcon: () => <ShoppingBasket />,
			url: `/buying${username ? `/${username}` : ''}`,
		},
	];

	const navigate = useNavigate();
	const gotoPage = (evt: MouseEvent, url: string) => {
		navigate(url);
		evt.preventDefault();
	};

	return (
		<Stack
			direction="row"
			spacing={3}
			marginTop={3}
			marginBottom={3}
			justifyContent="center"
		>
			{pages.map((pageData) => {
				return pageData.disabled ? (
					<Button
						key={pageData.id}
						className={classNames(css.button, css.disabled)}
						aria-label={pageData.label}
					>
						<Stack alignItems="center" gap={1} padding={1}>
							{pageData.renderIcon()}
						</Stack>
					</Button>
				) : (
					<Button
						key={pageData.id}
						className={classNames(
							css.button,
							pageData.id == pageId ? css.active : ''
						)}
						aria-label={pageData.label}
						href={pageData.url}
						onClick={(evt) => gotoPage(evt, pageData.url)}
					>
						<Stack alignItems="center" gap={1} padding={1}>
							{pageData.renderIcon()}
						</Stack>
					</Button>
				);
			})}
		</Stack>
	);
};
