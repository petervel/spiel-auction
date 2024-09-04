import { useParams } from 'react-router-dom';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { ItemsPage } from '../ItemsPage/ItemsPage';

export const BuyingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const buyer = pathUsername ?? bggUsername;

	const { data, error, isLoading } = useBids({ buyer });

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<ItemsPage
			title="Buying"
			items={data.items}
			totalBids={data.totalPrice}
		/>
	);
};
