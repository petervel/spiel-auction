import { Button } from '@mui/material';
import { ReactNode } from 'react';
import css from './TitleButton.module.css';

type SortToggleProps = {
	onClick: () => void;
	children: ReactNode;
};
export const TitleButton = ({ onClick, children }: SortToggleProps) => {
	const clickWrapper = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		onClick();
	};

	return (
		<Button
			className={css.button}
			onClick={clickWrapper}
			sx={{ minWidth: '42px' }}
		>
			{children}
		</Button>
	);
};
