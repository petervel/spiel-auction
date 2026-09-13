import {
	BarChartRounded,
	ExpandLessRounded,
	ExpandMoreRounded,
} from '@mui/icons-material';
import { Collapse, Stack } from '@mui/material';
import classNames from 'classnames';
import bggIcon from '../../assets/bgg.svg';
import { ItemsList } from '../ItemsList/ItemsList';
import { WishlistObject } from '../../hooks/useWishlist';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './AuctionItem.module.css';
import { WishlistStarButton } from './WishlistStarButton';
import rowCss from './WishlistObjectRow.module.css';

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
			<Stack
				direction="row"
				gap={1}
				className={classNames(rowCss.header, {
					[rowCss.expandable]: hasItems,
				})}
			>
				{/* With auction items, this expands/collapses them inline.
				    Without any yet, it's just a compare-page link instead
				    (like ObjectItem's), even though that page will be empty
				    for now - keeps this slot filled either way so the star/
				    bgg icons after it stay aligned with rows that do expand. */}
				<AuctionItemButton
					link={hasItems ? onToggleExpand : `/object/${object.objectId}`}
					tooltip={
						hasItems
							? expanded
								? 'Collapse'
								: 'Expand'
							: 'Compare with other auctions'
					}
				>
					{hasItems ? (
						expanded ? (
							<ExpandLessRounded sx={{ fontSize: '30px' }} />
						) : (
							<ExpandMoreRounded sx={{ fontSize: '30px' }} />
						)
					) : (
						<BarChartRounded sx={{ fontSize: '30px' }} />
					)}
				</AuctionItemButton>

				<a
					href={`/object/${object.objectId}`}
					className={classNames(
						css.objectName,
						css.hideOverflow,
						css.displayName,
						rowCss.name
					)}
				>
					{object.objectName}
				</a>

				{/* No gap here (unlike the outer Stack) - matches ItemButtons,
				    which relies on each button's own padding for spacing
				    between adjacent icons rather than adding an extra gap. */}
				<Stack direction="row">
					<WishlistStarButton objectId={object.objectId} />

					<AuctionItemButton
						link={`https://boardgamegeek.com/${object.objectSubtype}/${object.objectId}`}
						tooltip="Look up on BGG"
					>
						<img src={bggIcon} width="30" height="30" />
					</AuctionItemButton>
				</Stack>
			</Stack>

			{hasItems && (
				<Collapse in={expanded}>
					<ItemsList
						items={object.items}
						allowLikes={true}
						allowObjectActions={false}
					/>
				</Collapse>
			)}
		</div>
	);
};
