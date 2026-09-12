import {
	BarChartRounded,
	StarBorderRounded,
	StarRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { BggObject } from '../../hooks/useInfiniteObjects';
import { useWishlist } from '../../hooks/useWishlist';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './AuctionItem.module.css';

interface ObjectItemProps {
	object: BggObject;
	// The wishlist page's own list - every object shown here is already
	// wishlisted, so this renders a star toggle (starting filled) instead
	// of nothing. Toggling never refetches the wishlist query - it only
	// tracks local state, so the item stays in place until the page is
	// reloaded (same as the "Outbid & Liked" page's silentToggle hearts).
	allowWishlistToggle?: boolean;
}

export const ObjectItem = ({
	object,
	allowWishlistToggle = false,
}: ObjectItemProps) => {
	const { addToWishlistSilently, removeFromWishlistSilently } =
		useWishlist();
	const [isWishlistedLocally, setIsWishlistedLocally] = useState(true);

	const toggleWishlist = () => {
		if (isWishlistedLocally) {
			removeFromWishlistSilently(object.objectId);
		} else {
			addToWishlistSilently(object.objectId);
		}
		setIsWishlistedLocally((wasWishlisted) => !wasWishlisted);
	};

	return (
		<div className={css.container}>
			<Stack direction="row" gap={1}>
				<AuctionItemButton
					link={`/object/${object.objectId}`}
					tooltip="Compare with other auctions"
				>
					<BarChartRounded
						className="icon"
						sx={{ fontSize: '30px' }}
					/>
				</AuctionItemButton>

				<a
					href={`/object/${object.objectId}`}
					className={classNames(
						css.objectName,
						css.hideOverflow,
						css.displayName
					)}
				>
					{object.objectName}
				</a>

				{allowWishlistToggle && (
					<AuctionItemButton
						link={toggleWishlist}
						tooltip={
							isWishlistedLocally
								? 'Remove from wishlist'
								: 'Add back to wishlist'
						}
					>
						{isWishlistedLocally ? (
							<StarRounded
								sx={{ fontSize: '30px' }}
								color="warning"
							/>
						) : (
							<StarBorderRounded
								sx={{ fontSize: '30px' }}
								color="warning"
							/>
						)}
					</AuctionItemButton>
				)}

				<AuctionItemButton
					link={`https://boardgamegeek.com/${object.objectSubtype}/${object.objectId}`}
					tooltip="Look up on BGG"
				>
					<img src={bggIcon} width="30" height="30" />
				</AuctionItemButton>
			</Stack>
		</div>
	);
};
