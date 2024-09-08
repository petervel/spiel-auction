import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidAmount } from '../../components/BidAmount/BidAmount';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { EditBggUserName } from './EditBggUserName';

export const SellingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const [seller, setSeller] = useState(pathUsername ?? bggUsername);

	const { data, error, isLoading } = useBids({
		seller: seller ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<>
			<TabBar />
			<Container>
				<Title title="Selling" />
				{bggUsername == pathUsername && (
					<BidAmount
						amount={data.totalPrice}
						extraText={` (${data.items.length} items)`}
					/>
				)}
				{seller ? (
					<ItemsList items={data.items} />
				) : (
					<EditBggUserName onSave={setSeller} />
				)}
			</Container>
		</>
	);
};
