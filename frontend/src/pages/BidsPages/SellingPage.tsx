import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidAmount } from '../../components/BidAmount/BidAmount';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { Item } from '../../model/Item';
import { ItemsPage } from './ItemsPage';

export const SellingPage = () => {
	const { username: pathUsername } = useParams();
	const { bggUsername } = useBggUsername();

	const [seller, setSeller] = useState(pathUsername ?? bggUsername);

	const { data, error, isLoading } = useBids({
		seller: seller ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const soldCount = data.items.filter((item: Item) => item.hasBids).length;

	return (
		<>
			<TabBar />
			<ItemsPage
				title="Selling"
				username={seller}
				items={data.items}
				setUsername={setSeller}
				subTitle={
					bggUsername == pathUsername && (
						<BidAmount
							amount={data.totalPrice}
							extraText={` (${soldCount} of ${data.items.length} sold)`}
						/>
					)
				}
			/>
		</>
	);
};
