import Button from '@mui/material/Button';
import { DarkMode, LightMode } from '@mui/icons-material';
import classNames from 'classnames';
import { ColorModeContext } from '../../contexts/ColorModeContext';
import { useContext } from 'react';

type DarkModeToggleProps = {
	className?: string;
};
const DarkModeToggle = ({ className }: DarkModeToggleProps) => {
	const { mode, toggleDarkMode } = useContext(ColorModeContext);

	return (
		<Button
			className={classNames('flex-center', className)}
			onClick={toggleDarkMode}
		>
			{mode == 'dark' ? <DarkMode /> : <LightMode />}
		</Button>
	);
};

export default DarkModeToggle;
