import { useParams } from 'react-router-dom';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { ItemsPage } from '../ItemsPage/ItemsPage';

export const SellingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const seller = pathUsername ?? bggUsername;

	const { data, error, isLoading } = useBids({ seller });

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<ItemsPage
			title="Selling"
			items={data.items}
			totalBids={data.totalPrice}
		/>
	);
};