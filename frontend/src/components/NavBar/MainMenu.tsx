import {
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
	Menu,
	MenuItem,
	MenuList,
} from '@mui/material';
import classNames from 'classnames';
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { ColorModeContext } from '../../contexts/ColorModeContext';
import { useUser } from '../../hooks/useUser';
import css from './NavBar.module.css';

type MenuProps = {
	anchorEl: HTMLElement | null;
	close: () => void;
};

const MainMenu = ({ anchorEl, close }: MenuProps) => {
	const { mode, toggleDarkMode } = useContext(ColorModeContext);
	const { user, login, logout } = useUser();

	const closeWith = (func: () => void) => () => {
		close();
		func();
	};

	return (
		<>
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

					<MenuItem
						className={classNames(css.menuItem, css.darkModeMenu)}
						onClick={toggleDarkMode}
					>
						<ListItemIcon>
							<Checkbox
								sx={{ pl: 0 }}
								checked={mode === 'dark'}
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

					{/* Donate submenu trigger */}
					<MenuItem
						className={css.menuItem}
						component={NavLink}
						to="/donate"
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
