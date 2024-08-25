import { useState } from 'react';
import css from './RandomIcon.module.css';

import { Button } from '@mui/material';
import Icon1 from '../../assets/logo/die-hammer1.svg?react';
import Icon2 from '../../assets/logo/die-hammer2.svg?react';
import Icon3 from '../../assets/logo/die-hammer3.svg?react';
import Icon4 from '../../assets/logo/die-hammer4.svg?react';
import Icon5 from '../../assets/logo/die-hammer5.svg?react';
import Icon6 from '../../assets/logo/die-hammer6.svg?react';

const icons = [Icon1, Icon2, Icon3, Icon4, Icon5, Icon6];

type RandomIconProps = {
	onClick: () => void;
};
const RandomIcon = ({ onClick }: RandomIconProps) => {
	const selectRandomIcon = () => Math.floor(Math.random() * icons.length);
	const [icon, setIcon] = useState(selectRandomIcon());

	const click = () => {
		setIcon(selectRandomIcon());
		onClick();
	};

	return (
		<Button onClick={click} className={css.button}>
			{icon == 1 ? (
				<Icon1 className={css.logo} />
			) : icon == 2 ? (
				<Icon2 className={css.logo} />
			) : icon == 3 ? (
				<Icon3 className={css.logo} />
			) : icon == 4 ? (
				<Icon4 className={css.logo} />
			) : icon == 5 ? (
				<Icon5 className={css.logo} />
			) : (
				<Icon6 className={css.logo} />
			)}
		</Button>
	);
};

export default RandomIcon;
