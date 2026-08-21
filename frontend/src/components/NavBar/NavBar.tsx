import { MenuRounded, Search } from '@mui/icons-material';
import { Button, IconButton, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import classNames from 'classnames';
import { MouseEvent, useState } from 'react';
import RandomIcon from '../RandomIcon/RandomIcon';
import MainMenu from './MainMenu';
import css from './NavBar.module.css';
import SearchField from './SearchField';
import { Link } from 'react-router-dom';

export const NavBar = () => {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const openMenu = (evt: MouseEvent<HTMLElement>) =>
		setAnchorEl(evt.currentTarget);

	const [showSearch, setShowSearch] = useState(false);
	// Kept here rather than inside SearchField so it survives the field
	// being hidden (which unmounts it) - an accidental tap-away shouldn't
	// wipe out what the user typed.
	const [searchText, setSearchText] = useState('');

	return (
		<Stack direction="row" className={css.navbar}>
			<Stack
				className={classNames('content-max-width', css.content)}
				direction="row"
			>
				<Link to="/" className={css.headerLink}>
					<Stack direction="row" spacing={1} className={css.titleContainer}>
						<RandomIcon />
						{!showSearch && (
							<Typography
								variant="h5"
								component="h1"
								className={css.title}
							>
								Spiel Auction
							</Typography>
						)}
					</Stack>
				</Link>
				
				{showSearch && (
					<SearchField
						search={searchText}
						onSearchChange={setSearchText}
						onClose={() => setShowSearch(false)}
					/>
				)}
				<IconButton
					sx={{
						marginInlineStart: 'auto',
						borderRadius: '4px',
						minWidth: '64px',
					}}
					// mousedown fires before the search input's blur, so
					// toggling here (rather than onClick) avoids a race
					// where closing via this same button - which blurs the
					// input - immediately reopens it. preventDefault stops
					// the browser's own mousedown focus handling, which
					// otherwise lets the resulting layout shift move this
					// button out from under the cursor mid-click and steal
					// focus back (blurring the just-opened input again).
					onMouseDown={(evt) => {
						evt.preventDefault();
						setShowSearch((v) => !v);
					}}
				>
					<Search />
				</IconButton>

				<Button onClick={openMenu}>
					<MenuRounded />
				</Button>
				<MainMenu anchorEl={anchorEl} close={() => setAnchorEl(null)} />
			</Stack>
		</Stack>
	);
};
