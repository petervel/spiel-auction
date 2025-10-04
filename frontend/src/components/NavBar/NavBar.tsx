import { MenuRounded, Search } from '@mui/icons-material';
import { Button, IconButton, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import classNames from 'classnames';
import { MouseEvent, useState } from 'react';
import RandomIcon from '../RandomIcon/RandomIcon';
import DarkModeToggle from './DarkModeToggle';
import MainMenu from './MainMenu';
import css from './NavBar.module.css';
import SearchField from './SearchField';

export const NavBar = () => {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const openMenu = (evt: MouseEvent<HTMLElement>) =>
		setAnchorEl(evt.currentTarget);

	const [showSearch, setSearch] = useState(false);

	return (
		<Stack padding={3} direction="row" className={css.navbar}>
			<Stack
				className={classNames('content-max-width', css.content)}
				spacing={1}
				direction="row"
			>
				<RandomIcon onClick={() => (location.href = '/')} />
				{!showSearch && (
					<Typography
						variant="h5"
						component="h1"
						className={css.title}
						onClick={() => (location.href = '/')}
					>
						Spiel Auction
					</Typography>
				)}
				{showSearch && <SearchField />}
				<IconButton
					sx={{
						marginInlineStart: 'auto',
						borderRadius: '4px',
						minWidth: '64px',
					}}
					onClick={() => setSearch((v) => !v)}
				>
					<Search />
				</IconButton>

				<DarkModeToggle className={css.darkMode} />
				<Button onClick={openMenu}>
					<MenuRounded />
				</Button>
				<MainMenu anchorEl={anchorEl} close={() => setAnchorEl(null)} />
			</Stack>
		</Stack>
	);
};
