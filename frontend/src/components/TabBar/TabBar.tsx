import { Home, Sell, ShoppingBasket } from '@mui/icons-material';
import { Button, Stack } from '@mui/material';
import classNames from 'classnames';
import { MouseEvent, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePageId } from '../../hooks/usePageId';
import css from './TabBar.module.css';

type PageData = {
	id: 'latest' | 'sorted' | 'selling' | 'buying' | 'starred';
	label: string;
	renderIcon: () => ReactNode;
	url: string;
	disabled?: boolean;
};

const TabBar = () => {
	const pageId = usePageId();
	const [page] = useState(pageId);
	// const username = useBggUsername();
	const username = 'petervel';

	const pages: PageData[] = [
		{
			id: 'latest',
			label: 'Latest',
			renderIcon: () => <Home />,
			url: '/',
		},
		{
			id: 'selling',
			label: 'Selling',
			renderIcon: () => <Sell />,
			url: `/selling/${username}`,
			disabled: !username,
		},
		{
			id: 'buying',
			label: 'Buying',
			renderIcon: () => <ShoppingBasket />,
			url: `/buying/${username}`,
			disabled: !username,
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
							pageData.id == page ? css.active : ''
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

export default TabBar;
