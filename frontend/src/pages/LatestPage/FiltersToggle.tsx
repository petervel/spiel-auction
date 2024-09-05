import { Search } from '@mui/icons-material';
import { Button } from '@mui/material';

type FiltersToggleProps = {
	toggleFilters: (evt: React.MouseEvent) => void;
};
const FiltersToggle = ({ toggleFilters }: FiltersToggleProps) => {
	return (
		<Button onClick={toggleFilters}>
			<Search />
		</Button>
	);
};

export default FiltersToggle;
