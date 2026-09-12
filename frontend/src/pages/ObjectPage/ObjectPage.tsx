import { StarBorderRounded, StarRounded } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { TitleButton } from '../../components/Title/TitleButton';
import { useObject } from '../../hooks/useObject';
import { useUser } from '../../hooks/useUser';
import { useWishlist } from '../../hooks/useWishlist';

export const ObjectPage = () => {
	const { objectId } = useParams();
	const navigate = useNavigate();
	const { user } = useUser();
	const { data, isLoading, error } = useObject(Number(objectId));
	const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();

	if (!objectId) {
		navigate('/');
	}

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!data) {
		return <div>Error: failed to load data.</div>;
	}

	const numericObjectId = Number(objectId);
	const title = data.length ? data[0].objectName : `Object #${objectId}`;
	const wishlisted = isWishlisted(numericObjectId);

	const toggleWishlist = () => {
		if (wishlisted) {
			removeFromWishlist(numericObjectId);
		} else if (data.length) {
			const { objectId, objectType, objectSubtype, objectName } = data[0];
			addToWishlist({ objectId, objectType, objectSubtype, objectName });
		}
	};

	return (
		<Container>
			<Title
				title={title}
				right={
					user && (
						<TitleButton
							onClick={toggleWishlist}
							disabled={!wishlisted && data.length === 0}
							aria-label="Add to wishlist"
							aria-pressed={wishlisted}
						>
							{wishlisted ? (
								<StarRounded color="warning" />
							) : (
								<StarBorderRounded color="warning" />
							)}
						</TitleButton>
					)
				}
			/>
			<ItemsList items={data} allowLikes={true} />
		</Container>
	);
};
