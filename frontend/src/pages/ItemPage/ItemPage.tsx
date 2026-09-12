import { useNavigate, useParams } from 'react-router';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useItem } from '../../hooks/useItem';

// The single-item counterpart to ObjectPage (which compares every auction
// of a game) - what push notifications about one specific listing
// (outbid/newBid/won/wishlist listing) link to.
export const ItemPage = () => {
	const { itemId } = useParams();
	const navigate = useNavigate();

	if (!itemId) {
		navigate('/');
	}
	const { data: item, isLoading, error } = useItem(Number(itemId));

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!item) {
		return <div>Error: failed to load data.</div>;
	}

	return (
		<Container>
			<Title title={item.objectName} />
			<ItemsList items={[item]} allowLikes={true} startExpanded />
		</Container>
	);
};
