import { Sort } from '@mui/icons-material';
import { Button } from '@mui/material';
import css from './SortToggle.module.css';

type SortToggleProps = {
	toggleSort: (evt: React.MouseEvent) => void;
};
const SortToggle = ({ toggleSort }: SortToggleProps) => {
	return (
		<Button className={css.button} onClick={toggleSort}>
			<Sort />
		</Button>
	);
};

export default SortToggle;
