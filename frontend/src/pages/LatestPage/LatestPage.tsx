import AuctionItem from '../../components/AuctionItem/AuctionItem';
import Spinner from '../../components/Spinner/Spinner';
import useItems from '../../hooks/useItems';
import { Item } from '../../model/Item';
import css from './LatestPage.module.css';

const Latest = () => {
	const { data, isLoading, error } = useItems();

	if (isLoading) return <Spinner />;
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
