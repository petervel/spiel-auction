import { CircularProgress } from '@mui/material';
import css from './Spinner.module.css';

export const Spinner = () => {
	return (
		<div className={css.wrapper}>
			<CircularProgress color="primary" />
		</div>
	);
};
