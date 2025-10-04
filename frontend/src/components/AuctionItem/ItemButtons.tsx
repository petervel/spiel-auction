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
	const iconSize = 30;

	const toggleStar = (itemId: number) => {
		if (!starred) return; // still loading
		isStarred(itemId) ? unstarItem(itemId) : starItem(itemId);
	};

	const buttons = [
		showStar && {
			key: 'star',
			content: isStarred(item.id) ? <StarRounded className="icon" sx={{ fontSize: iconSize }} /> 
				: <StarOutlineRounded className="icon" sx={{ fontSize: iconSize }} />,
			onClick: () => toggleStar(item.id),
			tooltip: 'Add to starred items',
		},
		showCompare && {
			key: 'compare',
			content: <BarChartRounded className="icon" sx={{ fontSize: iconSize }} />,
			link: `/object/${item.objectId}`,
			tooltip: 'Compare with other auctions',
		},
		{
			key: 'bgg',
			content: <img src={bggIcon} width={iconSize} height={iconSize} />,
			link: `https://boardgamegeek.com/${item.objectSubtype}/${item.objectId}`,
			newTab: true,
			tooltip: 'Look up on BGG',
		},
	].filter(Boolean) as Array<{
		key: string;
		content: React.ReactNode;
		link?: string | (() => void);
		onClick?: () => void;
		newTab?: boolean;
		tooltip?: string;
	}>;

	return (
		<Stack direction="row">
			{allowBookmarks && location === 'list' && (
				<div className={css.bookmark}>
					<BookmarkButton itemId={item.id} className={bookmarkClass} />
				</div>
			)}

			<div className={location === 'list' ? css.bigScreen : css.smallScreen}>
				{buttons.map((btn) => (
					<AuctionItemButton
						key={btn.key}
						link={btn.link || btn.onClick!}
						newTab={btn.newTab}
						tooltip={btn.tooltip}
					>
						{btn.content}
					</AuctionItemButton>
				))}
			</div>
		</Stack>
	);
};
