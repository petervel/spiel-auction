import {
	BarChartRounded,
	StarOutlineRounded,
	StarRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import bggIcon from '../../assets/bgg.svg';
import { useStarred } from '../../hooks/useStarred';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import BookmarkButton from './BookmarkButton';
import css from './ItemButtons.module.css';

interface ItemButtonsProps {
	item: Item;
	showCompare: boolean;
	location: 'list' | 'details';
	showStar?: boolean;
	allowBookmarks?: boolean;
	bookmarkClass?: string;
}

export const ItemButtons = ({
	item,
	showCompare,
	location = 'list',
	showStar = false,
	allowBookmarks = false,
	bookmarkClass = '',
}: ItemButtonsProps) => {
	const { starItem, unstarItem, starred, isStarred } = useStarred();

	const toggleStar = (itemId: number) => {
		if (!starred) return; // still loading

		if (isStarred(itemId)) {
			unstarItem(itemId);
		} else {
			starItem(itemId);
		}
	};

	return (
		<Stack direction="row">
			<div className={css.bookmark}>
				{allowBookmarks && location == 'list' && (
					<BookmarkButton
						itemId={item.id}
						className={bookmarkClass}
					/>
				)}
			</div>
			<div
				className={location == 'list' ? css.bigScreen : css.smallScreen}
			>
				{showStar && (
					<AuctionItemButton
						link={() => toggleStar(item.id)}
						tooltip="Add to starred items"
					>
						{isStarred(item.id) ? (
							<StarRounded
								className="icon"
								sx={{ fontSize: '30px' }}
							/>
						) : (
							<StarOutlineRounded
								className="icon"
								sx={{ fontSize: '30px' }}
							/>
						)}
					</AuctionItemButton>
				)}
				{showCompare && (
					<AuctionItemButton
						link={`/object/${item.objectId}`}
						tooltip="Compare with other auctions"
					>
						<BarChartRounded
							className="icon"
							sx={{ fontSize: '30px' }}
						/>
					</AuctionItemButton>
				)}
				<AuctionItemButton
					link={`https://boardgamegeek.com/${item.objectSubtype}/${item.objectId}`}
					newTab
					tooltip="Look up on BGG"
				>
					<img src={bggIcon} width="30" height="30" />
				</AuctionItemButton>
			</div>
		</Stack>
	);
};
