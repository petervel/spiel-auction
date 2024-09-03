import { Button, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import classNames from 'classnames';
import RandomIcon from '../RandomIcon/RandomIcon';
// import SearchDialog from '../SearchDialog/SearchDialog';
import { Settings } from '@mui/icons-material';
import DarkModeToggle from './DarkModeToggle';
// import MainMenu from './MainMenu';
import { useNavigate } from 'react-router-dom';
import css from './NavBar.module.css';

const NavBar = () => {
	// const [searchOpen, setSearchOpen] = useState(false);
	// const openMenu = (evt: MouseEvent<HTMLButtonElement>) =>
	// 	setAnchorEl(evt.currentTarget);
	// const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const navigate = useNavigate();
	const gotoPage = (url: string) => {
		navigate(url);
	};

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
				</Button>
				<MainMenu anchorEl={anchorEl} close={() => setAnchorEl(null)} /> */}
				<Button
					className={css.button}
					href="/settings"
					onClick={() => gotoPage('/')}
				>
					<Settings />
				</Button>
			</Stack>
		</Stack>
	);
};

export default NavBar;
