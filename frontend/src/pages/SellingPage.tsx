import { useParams } from 'react-router-dom';
import { useBggUsername } from '../hooks/useBggUsername';
import { ItemsPage } from './ItemsPage/ItemsPage';

const SellingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const seller = pathUsername ?? bggUsername;

	return ItemsPage({ filter: { seller } });
};

export default SellingPage;
