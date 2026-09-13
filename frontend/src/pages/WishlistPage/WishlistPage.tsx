import { StarBorderRounded } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { ObjectItem } from '../../components/AuctionItem/ObjectItem';
import { Container } from '../../components/Container/Container';
import itemsListCss from '../../components/ItemsList/ItemsList.module.css';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useUser } from '../../hooks/useUser';
import { useWishlist } from '../../hooks/useWishlist';
import css from './WishlistPage.module.css';

export const WishlistPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const { wishlist, isLoading: wishlistLoading } = useWishlist();

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div>
				<LoginLink /> to see your wishlist.
			</div>
		);
	}

	if (wishlistLoading) return <Spinner />;

	const objects = wishlist?.objects ?? [];

	return (
		<Container>
			<Title title="Wishlist" />
			{objects.length ? (
				<ul className={itemsListCss.items}>
					{objects.map((object) => (
						<ObjectItem
							key={object.objectId}
							object={object}
							allowWishlistToggle
						/>
					))}
				</ul>
			) : (
				<Stack alignItems="center" gap={2} className={css.empty}>
					<StarBorderRounded
						className={css.emptyIcon}
						style={{ fontSize: '3rem' }}
					/>
					<Typography color="text.secondary">
						No games on your wishlist yet.
					</Typography>
					<Button component={Link} to="/wishlist/import" variant="contained">
						Import from BGG
					</Button>
				</Stack>
			)}
		</Container>
	);
};
