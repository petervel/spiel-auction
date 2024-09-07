import { MenuRounded } from '@mui/icons-material';
import { Button, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import classNames from 'classnames';
import { MouseEvent, useState } from 'react';
import RandomIcon from '../RandomIcon/RandomIcon';
import DarkModeToggle from './DarkModeToggle';
import MainMenu from './MainMenu';
import css from './NavBar.module.css';

export const NavBar = () => {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const openMenu = (evt: MouseEvent<HTMLElement>) =>
		setAnchorEl(evt.currentTarget);

	return (
		<Stack padding={3} direction="row" className={css.navbar}>
			<Stack
				className={classNames('content-max-width', css.content)}
				spacing={1}
				direction="row"
			>
				<RandomIcon onClick={() => (location.href = '/')} />
				<Typography variant="h5" component="h1" className={css.title}>
					Spiel Auction
				</Typography>
				<DarkModeToggle className={css.darkMode} />
				<Button onClick={openMenu}>
					<MenuRounded />
				</Button>
				<MainMenu anchorEl={anchorEl} close={() => setAnchorEl(null)} />
			</Stack>
		</Stack>
	);
};
