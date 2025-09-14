import {
	CardGiftcardRounded,
	LoginRounded,
	LogoutRounded,
	Save,
	SettingsRounded,
	VolunteerActivismRounded,
} from '@mui/icons-material';
import {
	Checkbox,
	Divider,
	ListItemIcon,
	ListSubheader,
	Menu,
	MenuItem,
	MenuList,
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import { useUser } from '../../hooks/useUser';
// import SwitchAuctionDialog from './SwitchAuctionDialog';
import classNames from 'classnames';
import { useContext } from 'react';
import { ColorModeContext } from '../../contexts/ColorModeContext';
import css from './NavBar.module.css';

type MenuProps = {
	anchorEl: HTMLElement | null;
	close: () => void;
};
const MainMenu = ({ anchorEl, close }: MenuProps) => {
	// const [switchAuctionOpen, setSwitchAuctionOpen] = useState(false);
	// const openSwitchAuction = () => {
	// 	setSwitchAuctionOpen(true);
	// };

	const { mode, toggleDarkMode } = useContext(ColorModeContext);

	const openPaypalPage = () => {
		const url =
			'https://www.paypal.com/donate/?hosted_button_id=HVYVSGYNRGT4N';
		window.open(url, '_blank');
	};

	const openTikkiePage = () => {
		const url = 'https://tikkie.me/pay/5uobupeobapt08qe2kmu';
		window.open(url, '_blank');
	};

	const closeWith = (func: () => void) => () => {
		close();
		func();
	};

	const { user, login, logout } = useUser();

	return (
		<>
			{/* <SwitchAuctionDialog
				open={switchAuctionOpen}
				onClose={() => setSwitchAuctionOpen(false)}
			/> */}
			<Menu open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={close}>
				<MenuList className={css.menu}>
					<MenuItem
						className={css.menuItem}
						component={NavLink}
						onClick={close}
						to="/settings"
					>
						<ListItemIcon>
							<SettingsRounded className={css.menuIcon} />
						</ListItemIcon>
						Settings
					</MenuItem>
					<MenuItem
						className={css.menuItem}
						component={NavLink}
						onClick={close}
						to="/export"
					>
						<ListItemIcon>
							<Save className={css.menuIcon} />
						</ListItemIcon>
						Export
					</MenuItem>

					{/* <MenuItem
						className={css.menuItem}
						onClick={closeWith(openSwitchAuction)}
					>
						<ListItemIcon>
							<GavelRounded className={css.menuIcon} />
						</ListItemIcon>
						Switch Auction
					</MenuItem> */}
					<MenuItem
						className={classNames(css.menuItem, css.darkModeMenu)}
						onClick={toggleDarkMode}
					>
						<ListItemIcon>
							<Checkbox
								sx={{ pl: 0 }}
								checked={mode == 'dark'}
								onChange={toggleDarkMode}
								color="default"
							/>
						</ListItemIcon>
						Dark mode
					</MenuItem>
					<Divider />
					{!user ? (
						<MenuItem
							className={css.menuItem}
							onClick={closeWith(login)}
						>
							<ListItemIcon>
								<LoginRounded className={css.menuIcon} />
							</ListItemIcon>
							Login
						</MenuItem>
					) : (
						<MenuItem
							className={css.menuItem}
							onClick={closeWith(logout)}
						>
							<ListItemIcon>
								<LogoutRounded className={css.menuIcon} />
							</ListItemIcon>
							Logout
						</MenuItem>
					)}
					<Divider />
					<ListSubheader>Donate</ListSubheader>
					<MenuItem
						className={css.menuItem}
						onClick={closeWith(openPaypalPage)}
					>
						<ListItemIcon>
							<CardGiftcardRounded className={css.menuIcon} />
						</ListItemIcon>
						Paypal
					</MenuItem>
					<MenuItem
						className={css.menuItem}
						onClick={closeWith(openTikkiePage)}
					>
						<ListItemIcon>
							<VolunteerActivismRounded
								className={css.menuIcon}
							/>
						</ListItemIcon>
						Tikkie
					</MenuItem>
				</MenuList>
			</Menu>
		</>
	);
};

export default MainMenu;
