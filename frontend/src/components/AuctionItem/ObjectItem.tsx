import { BarChartRounded } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { BggObject } from '../../hooks/useInfiniteObjects';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import { BggLookupButton } from './BggLookupButton';
import css from './AuctionItem.module.css';
import { WishlistStarButton } from './WishlistStarButton';

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

				{/* No gap here (unlike the outer Stack) - matches ItemButtons,
				    which relies on each button's own padding for spacing
				    between adjacent icons rather than adding an extra gap. */}
				<Stack direction="row">
					{allowWishlistToggle && (
						<WishlistStarButton objectId={object.objectId} />
					)}

					<BggLookupButton
						objectSubtype={object.objectSubtype}
						objectId={object.objectId}
					/>
				</Stack>
			</Stack>
		</div>
	);
};
