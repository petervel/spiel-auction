import { Typography } from '@mui/material';
import { ReactNode } from 'react';
import css from './Title.module.css';

type TitleProps = {
	title: string;
	left?: ReactNode;
	right?: ReactNode;
};
export const Title = ({ title, left, right }: TitleProps) => {
	return (
		<div className={css.header}>
			<div className={css.left}>{left}</div>
			<Typography variant="h5" component="h2" className={css.title} mx={0}>
				{title}
			</Typography>
			<div className={css.right}>{right}</div>
		</div>
	);
};
