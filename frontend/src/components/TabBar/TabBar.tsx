import {
	HeartBroken,
	Sell,
	ShoppingBasket,
	StarRounded,
	WatchLaterRounded
} from '@mui/icons-material';
import { Button, Stack } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import { Link } from 'react-router';
import { useBggUsername } from '../../hooks/useBggUsername';
import { usePageId } from '../../hooks/usePageId';
import { useUser } from '../../hooks/useUser';
import css from './TabBar.module.css';

type PageData = {
	id: 'latest' | 'search' | 'selling' | 'buying' | 'starred' | 'outbids';
	label: string;
	renderIcon: () => ReactNode;
	url: string;
	disabled?: boolean;
};

export const TabBar = () => {
	const pageId = usePageId();
	const { bggUsername } = useBggUsername();
	const { user } = useUser();

	const pages: PageData[] = [
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
			id: 'outbids',
			label: 'Outbid',
			renderIcon: () => <HeartBroken />,
			url: `/outbids${bggUsername ? `/${bggUsername}` : ''}`,
		},
		{
			id: 'starred',
			label: 'Starred',
			disabled: !user,
			renderIcon: () => <StarRounded />,
			url: `/starred`,
		},
	];

	return (
		<Stack
			direction="row"
			spacing={1}
			marginBlock={3}
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
					<Link to={pageData.url} key={pageData.id}>
						<Button
							className={classNames(
								css.button,
								pageData.id == pageId ? css.active : ''
							)}
							aria-label={pageData.label}
						>
							<Stack alignItems="center" gap={1} padding={1}>
								{pageData.renderIcon()}
							</Stack>
						</Button>
					</Link>
				);
			})}
		</Stack>
	);
};
