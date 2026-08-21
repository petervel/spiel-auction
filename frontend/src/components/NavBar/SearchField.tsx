import { Input } from '@mui/material';
import { createSearchParams, useNavigate } from 'react-router-dom';
import css from './SearchField.module.css';

type SearchFieldProps = {
	search: string;
	onSearchChange: (search: string) => void;
	onClose?: () => void;
};

// search is lifted to NavBar (rather than local state here) so it
// survives hiding the field - this component unmounts on blur, which
// would otherwise wipe out whatever the user had typed.
const SearchField = ({ search, onSearchChange, onClose }: SearchFieldProps) => {
	const navigate = useNavigate();
	const handleSearch = () => {
		if (search.length === 0) return;

		navigate({
			pathname: '/search',
			search: createSearchParams({
				search: search.trim(),
			}).toString(),
		});
	};

	return (
		<Input
			autoFocus={true}
			className={css.searchBox}
			value={search}
			onChange={(event) => onSearchChange(event.target.value)}
			onKeyUp={(event) => {
				if (event.key === 'Enter') {
					handleSearch();
				}
			}}
			onBlur={onClose}
		/>
	);
};

export default SearchField;
