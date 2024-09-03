import { SettingsRounded, VolunteerActivismRounded } from '@mui/icons-material';
import { ListItemIcon, Menu, MenuItem, MenuList } from '@mui/material';
import { NavLink } from 'react-router-dom';
// import SwitchAuctionDialog from './SwitchAuctionDialog';
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

	const openDonatePage = () => {
		const url =
			'https://www.paypal.com/donate/?hosted_button_id=HVYVSGYNRGT4N';
		window.open(url, '_blank');
	};

	const closeWith = (func: () => void) => () => {
		close();
		func();
	};

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
					{/* <MenuItem
						className={css.menuItem}
						onClick={closeWith(openSwitchAuction)}
					>
						<ListItemIcon>
							<GavelRounded className={css.menuIcon} />
						</ListItemIcon>
						Switch Auction
					</MenuItem> */}
					{/* <MenuItem
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
					</MenuItem> */}
					{/* <Divider /> */}
					<MenuItem
						className={css.menuItem}
						onClick={closeWith(openDonatePage)}
					>
						<ListItemIcon>
							<VolunteerActivismRounded
								className={css.menuIcon}
							/>
						</ListItemIcon>
						Donate
					</MenuItem>
				</MenuList>
			</Menu>
		</>
	);
};

export default MainMenu;
