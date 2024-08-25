import { Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import classNames from 'classnames';
import RandomIcon from '../RandomIcon/RandomIcon';
// import SearchDialog from '../SearchDialog/SearchDialog';
// import MainMenu from './MainMenu';
import DarkModeToggle from './DarkModeToggle';
import css from './NavBar.module.css';

const NavBar = () => {
	// const [searchOpen, setSearchOpen] = useState(false);
	// const openMenu = (evt: MouseEvent<HTMLButtonElement>) =>
	// 	setAnchorEl(evt.currentTarget);
	// const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

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
				{/* <Button>
					<Search onClick={() => setSearchOpen(true)} />
				</Button> */}
				{/* <SearchDialog
					isOpen={searchOpen}
					onClose={() => setSearchOpen(false)}
				/> */}
				{/* <Button onClick={openMenu}>
					<MenuRounded />
				</Button> */}
				{/* <MainMenu anchorEl={anchorEl} close={() => setAnchorEl(null)} /> */}
			</Stack>
		</Stack>
	);
};

export default NavBar;
