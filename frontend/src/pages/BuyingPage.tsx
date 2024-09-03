import { useParams } from 'react-router-dom';
import { useBggUsername } from '../hooks/useBggUsername';
import { ItemsPage } from './ItemsPage/ItemsPage';

const BuyingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const buyer = pathUsername ?? bggUsername;

	return ItemsPage({ filter: { buyer } });
};

export default BuyingPage;
