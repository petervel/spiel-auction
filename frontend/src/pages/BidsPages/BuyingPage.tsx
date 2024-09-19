import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidAmount } from '../../components/BidAmount/BidAmount';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import css from './BuyingPage.module.css';
import { ItemsPage } from './ItemsPage';

export const BuyingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const [buyer, setBuyer] = useState(pathUsername ?? bggUsername);

	const { data, error, isLoading } = useBids({
		buyer: buyer ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<>
			<TabBar />
			<ItemsPage
				title="Buying"
				username={buyer}
				items={data.items}
				setUsername={setBuyer}
				subTitle={
					bggUsername == pathUsername && (
						<BidAmount
							amount={data.totalPrice}
							extraText={` (${data.items.length} items)`}
						/>
					)
				}
			/>
			<div className={css.hint}>
				Psst.. Do you want to see the items you were{' '}
				<a href="/outbids">outbid</a> on?
			</div>
		</>
	);
};
