import { ObjectsList } from '../../components/ItemsList/ObjectsList';
import { BggObject } from '../../hooks/useObjects';

type SearchResultsProps = {
	data: BggObject[];
	search: string | undefined;
};
const SearchResults = ({ data, search }: SearchResultsProps) => {
	return <ObjectsList objects={data} search={search} />;
};

export default SearchResults;
