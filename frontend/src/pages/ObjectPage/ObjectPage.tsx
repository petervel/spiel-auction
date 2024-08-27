import { useNavigate, useParams } from 'react-router';
import AuctionItem from '../../components/AuctionItem/AuctionItem';
import Spinner from '../../components/Spinner/Spinner';
import { useObject } from '../../hooks/useObject';
import { Item } from '../../model/Item';

const Object = () => {
	const { objectId } = useParams();
	const navigate = useNavigate();

	console.log('....', objectId);
	if (!objectId) {
		navigate('/');
	}
	const { data, isLoading, error } = useObject(Number(objectId));

	if (isLoading) return <Spinner />;
	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<div>
			{data.map((item: Item) => (
				<AuctionItem key={item.id} item={item} />
			))}
		</div>
	);
};

export default Object;
