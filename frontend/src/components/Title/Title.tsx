import { Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import css from './Title.module.css';

type TitleProps = {
	title: string;
	left?: ReactNode;
	right?: ReactNode;
};
export const Title = ({ title, left, right }: TitleProps) => {
	return (
		<Stack direction="row" className={css.header}>
			{left && <div className={css.left}>{left}</div>}
			<div className={css.filler}></div>
			<Typography variant="h5" component="h2" className={css.title}>
				{title}
			</Typography>
			{right && <div className={css.right}>{right}</div>}
		</Stack>
	);
};
