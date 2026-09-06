import {
	BarChartRounded,
	FavoriteBorderRounded,
	FavoriteRounded,
	HeartBrokenRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import { useState } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { useLiked } from '../../hooks/useLiked';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

interface ItemButtonsProps {
	item: Item;
	showCompare: boolean;
	showLike?: boolean;
	// Everything shown here starts out liked (e.g. the "Outbid & Liked"
	// page) - renders a broken heart instead of the usual like/unlike
	// toggle, and never refetches the liked list: the item stays in place
	// even after you remove it, and clicking again re-likes it, all purely
	// as local state until the page is reloaded.
	silentToggle?: boolean;
	// Within silentToggle, shows the broken heart instead of a normal one -
	// for items you're currently outbid on, as opposed to ones you've only
	// liked without ever bidding.
	isOutbid?: boolean;
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
	silentToggle = false,
	isOutbid = false,
}: ItemButtonsProps) => {
	// Query is only needed to know isLiked() for the normal toggle case -
	// skip fetching it entirely for a silentToggle button, which tracks its
	// own liked state locally instead.
	const { likeItem, unlikeItem, likeItemSilently, unlikeItemSilently, liked, isLiked } =
		useLiked({ enabled: !silentToggle });
	const iconSize = 30;

	// Starts liked, since silentToggle only ever renders for items that
	// were liked when the page loaded.
	const [isLikedLocally, setIsLikedLocally] = useState(true);

	const toggleLike = (itemId: number) => {
		if (!liked) return;
		isLiked(itemId) ? unlikeItem(itemId) : likeItem(itemId);
	};

	const toggleLikeSilently = (itemId: number) => {
		isLikedLocally ? unlikeItemSilently(itemId) : likeItemSilently(itemId);
		setIsLikedLocally((wasLiked) => !wasLiked);
	};

	const buttons: ButtonConfig[] = [
		(showLike || silentToggle) && {
			key: 'like',
			content: silentToggle ? (
				isLikedLocally ? (
					isOutbid ? (
						<HeartBrokenRounded
							sx={{ fontSize: iconSize, color: 'var(--color-heart)' }}
						/>
					) : (
						<FavoriteRounded
							sx={{ fontSize: iconSize, color: 'var(--color-heart)' }}
						/>
					)
				) : (
					<FavoriteBorderRounded
						sx={{ fontSize: iconSize, color: 'var(--color-heart)' }}
					/>
				)
			) : isLiked(item.id) ? (
				<FavoriteRounded
					sx={{ fontSize: iconSize, color: 'var(--color-heart)' }}
				/>
			) : (
				<FavoriteBorderRounded
					sx={{ fontSize: iconSize, color: 'var(--color-heart)' }}
				/>
			),
			onClick: () =>
				silentToggle ? toggleLikeSilently(item.id) : toggleLike(item.id),
			tooltip: silentToggle
				? isLikedLocally
					? 'Remove from liked items'
					: 'Add back to liked items'
				: 'Add to liked items',
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
