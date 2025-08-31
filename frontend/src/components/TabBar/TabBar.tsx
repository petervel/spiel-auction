import {
	Schedule,
	Sell,
	SentimentDissatisfied,
	ShoppingBasket,
	StarOutlineRounded,
} from '@mui/icons-material';
import { Button, Stack } from '@mui/material';
import classNames from 'classnames';
import { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
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
			renderIcon: () => <SentimentDissatisfied />,
			url: `/outbids${bggUsername ? `/${bggUsername}` : ''}`,
		},
	];

	// console.log({ user });
	if (user) {
		pages.push({
			id: 'starred',
			label: 'Starred',
			renderIcon: () => <StarOutlineRounded />,
			url: `/starred`,
		});
		// console.log({ pages });
	}

	const navigate = useNavigate();
	const gotoPage = (evt: MouseEvent, url: string) => {
		navigate(url);
		evt.preventDefault();
	};

	return (
		<Stack
			direction="row"
			spacing={2}
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
