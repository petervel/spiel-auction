import { Search } from '@mui/icons-material';
import { Button } from '@mui/material';
import css from './FiltersToggle.module.css';

type FiltersToggleProps = {
	toggleFilters: (evt: React.MouseEvent) => void;
};
const FiltersToggle = ({ toggleFilters }: FiltersToggleProps) => {
	return (
		<Button className={css.button} onClick={toggleFilters}>
			<Search />
		</Button>
	);
};

export default FiltersToggle;
