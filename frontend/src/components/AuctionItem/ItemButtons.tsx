import {
	BarChartRounded,
	FavoriteBorderRounded,
	FavoriteRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import bggIcon from '../../assets/bgg.svg';
import { useLiked } from '../../hooks/useLiked';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

interface ItemButtonsProps {
	item: Item;
	showCompare: boolean;
	showLike?: boolean;
}

type ButtonConfig = {
	key: string;
	content: React.ReactNode;
	link?: string | (() => void);
	onClick?: () => void;
	newTab?: boolean;
	tooltip?: string;
};

export const ItemButtons = ({
	item,
	showCompare,
	showLike = false,
}: ItemButtonsProps) => {
	const { likeItem, unlikeItem, liked, isLiked } = useLiked();
	const iconSize = 30;

	const toggleLike = (itemId: number) => {
		if (!liked) return;
		isLiked(itemId) ? unlikeItem(itemId) : likeItem(itemId);
	};

	const buttons: ButtonConfig[] = [
		showLike && {
			key: 'like',
			content: isLiked(item.id) ? (
				<FavoriteRounded className="icon" sx={{ fontSize: iconSize }} />
			) : (
				<FavoriteBorderRounded
					className="icon"
					sx={{ fontSize: iconSize }}
				/>
			),
			onClick: () => toggleLike(item.id),
			tooltip: 'Add to liked items',
		},
		showCompare && {
			key: 'compare',
			content: (
				<BarChartRounded className="icon" sx={{ fontSize: iconSize }} />
			),
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
	].filter(Boolean) as ButtonConfig[];

	return (
		<Stack direction="row">
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
		</Stack>
	);
};
