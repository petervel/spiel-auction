import { ExpandLessRounded, ExpandMoreRounded } from '@mui/icons-material';
import { Collapse, Stack } from '@mui/material';
import classNames from 'classnames';
import bggIcon from '../../assets/bgg.svg';
import { ItemsList } from '../ItemsList/ItemsList';
import { WishlistObject } from '../../hooks/useWishlist';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './AuctionItem.module.css';
import { WishlistStarButton } from './WishlistStarButton';

type Props = {
	object: WishlistObject;
	expanded: boolean;
	onToggleExpand: () => void;
};

// The wishlist page's row: like ObjectItem, but the compare button is
// replaced with an expand/collapse toggle that reveals this object's
// current-fair auction items inline (when there are any) instead of
// navigating to the compare page.
export const WishlistObjectRow = ({
	object,
	expanded,
	onToggleExpand,
}: Props) => {
	const hasItems = object.items.length > 0;

	return (
		<div className={css.container}>
			<Stack direction="row" gap={1}>
				{hasItems && (
					<AuctionItemButton
						link={onToggleExpand}
						tooltip={expanded ? 'Collapse' : 'Expand'}
					>
						{expanded ? (
							<ExpandLessRounded sx={{ fontSize: '30px' }} />
						) : (
							<ExpandMoreRounded sx={{ fontSize: '30px' }} />
						)}
					</AuctionItemButton>
				)}

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

				<WishlistStarButton objectId={object.objectId} />

				<AuctionItemButton
					link={`https://boardgamegeek.com/${object.objectSubtype}/${object.objectId}`}
					tooltip="Look up on BGG"
				>
					<img src={bggIcon} width="30" height="30" />
				</AuctionItemButton>
			</Stack>

			{hasItems && (
				<Collapse in={expanded}>
					<ItemsList items={object.items} allowLikes={true} />
				</Collapse>
			)}
		</div>
	);
};
