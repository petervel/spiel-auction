import AuctionItem from '../components/AuctionItem/AuctionItem';
import useItems from '../hooks/useItems';
import { Item } from '../model/Item';
import css from './Latest.module.css';

const Latest = () => {
	const { data, isLoading, error } = useItems();

	if (isLoading) return <div>Loading...</div>;
	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<div>
			<ul className={css.items}>
				{data.map((item: Item) => (
					<AuctionItem key={item.id} item={item} />
				))}
			</ul>
		</div>
	);
};

export default Latest;
