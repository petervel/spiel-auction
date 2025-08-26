import {
	BarChartRounded,
	StarOutlineRounded,
	StarRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import { useState } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { useStarring } from '../../hooks/useStarring';
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
	showStar = true,
	allowBookmarks = false,
	bookmarkClass = '',
}: ItemButtonsProps) => {
	const { starItem, unstarItem } = useStarring();
	const [starred, setStarred] = useState(item.starred);

	const toggleStar = () => {
		console.log('toggle star', starred);
		if (starred === undefined) return;
		if (starred) {
			unstarItem(item.id);
			setStarred(false);
		} else {
			starItem(item.id);
			setStarred(true);
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
						link={toggleStar}
						tooltip="Add to starred items"
					>
						{starred ? (
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
