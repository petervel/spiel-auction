import { ObjectsList } from '../../components/ItemsList/ObjectsList';
import { BggObject } from '../../hooks/useObjects';

type SearchResultsProps = {
	data: BggObject[];
};
const SearchResults = ({ data }: SearchResultsProps) => {
	return <ObjectsList objects={data} />;
};

export default SearchResults;
