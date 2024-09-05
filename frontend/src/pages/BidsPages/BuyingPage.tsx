import { useParams } from 'react-router-dom';
import { BidAmount } from '../../components/BidAmount/BidAmount';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';

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
		<>
			<TabBar />
			<Container>
				<Title title="Buying" />
				<BidAmount amount={data.totalPrice} />
				<ItemsList items={data.items} />
			</Container>
		</>
	);
};
