import { StarBorderRounded, StarRounded } from '@mui/icons-material';
import { useState } from 'react';
import { useWishlist } from '../../hooks/useWishlist';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

type Props = {
	objectId: number;
};

// Inline row star toggle (as opposed to StarToggle, used for the page-title
// button and the import page's checkboxes). Every place this renders shows
// an object that's already wishlisted, so it starts filled and never
// refetches the wishlist query - toggling only tracks local state, so the
// row stays put until the page is reloaded (same as the "Outbid & Liked"
// page's silentToggle hearts).
export const WishlistStarButton = ({ objectId }: Props) => {
	const { addToWishlistSilently, removeFromWishlistSilently } =
		useWishlist();
	const [isWishlistedLocally, setIsWishlistedLocally] = useState(true);

	const toggleWishlist = () => {
		if (isWishlistedLocally) {
			removeFromWishlistSilently(objectId);
		} else {
			addToWishlistSilently(objectId);
		}
		setIsWishlistedLocally((wasWishlisted) => !wasWishlisted);
	};

	return (
		<AuctionItemButton
			link={toggleWishlist}
			tooltip={
				isWishlistedLocally ? 'Remove from wishlist' : 'Add back to wishlist'
			}
		>
			{isWishlistedLocally ? (
				<StarRounded sx={{ fontSize: '30px' }} color="warning" />
			) : (
				<StarBorderRounded sx={{ fontSize: '30px' }} color="warning" />
			)}
		</AuctionItemButton>
	);
};
