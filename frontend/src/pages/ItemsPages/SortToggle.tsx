import { Sort } from '@mui/icons-material';
import { Button } from '@mui/material';
import css from './SortToggle.module.css';

type SortToggleProps = {
	toggleSort: () => void;
};
const SortToggle = ({ toggleSort }: SortToggleProps) => {
	const toggleSortWrapper = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		toggleSort();
	};

	return (
		<Button className={css.button} onClick={toggleSortWrapper}>
			<Sort />
		</Button>
	);
};

export default SortToggle;
