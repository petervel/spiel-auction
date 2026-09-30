import {
	BarChartRounded,
	FavoriteBorderRounded,
	FavoriteRounded,
	HeartBrokenRounded,
} from '@mui/icons-material';
import { Stack } from '@mui/material';
import { useState } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { useDismissed } from '../../hooks/useDismissed';
import { useLiked } from '../../hooks/useLiked';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

interface ItemButtonsProps {
	item: Item;
	showCompare: boolean;
	// Off on the wishlist page's nested items - the object-level compare/BGG
	// links are already shown once, on the object header above them, so
	// repeating a BGG link per listing would just be redundant there.
	showBgg?: boolean;
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
	showBgg = true,
	showLike = false,
	silentToggle = false,
	isOutbid = false,
}: ItemButtonsProps) => {
	// Query is only needed to know isLiked() for the normal toggle case -
	// skip fetching it entirely for a silentToggle button, which tracks its
	// own liked state locally instead.
	const { likeItem, unlikeItem, likeItemSilently, unlikeItemSilently, liked, isLiked } =
		useLiked({ enabled: !silentToggle });
	const { dismissItemSilently, undismissItemSilently } = useDismissed();
	const iconSize = 30;

	// Starts shown, since silentToggle only ever renders for items that were
	// liked/outbid-and-not-dismissed when the page loaded. For an outbid
	// item this tracks "is it still shown", not literally "is it liked" -
	// toggling it off dismisses rather than unlikes (see isOutbid below).
	const [isLikedLocally, setIsLikedLocally] = useState(true);

	const toggleLike = (itemId: number) => {
		if (!liked) return;
		if (isLiked(itemId)) {
			unlikeItem(itemId);
		} else {
			likeItem(itemId);
		}
	};

	const toggleLikeSilently = (itemId: number) => {
		if (isOutbid) {
			if (isLikedLocally) {
				dismissItemSilently(itemId);
			} else {
				undismissItemSilently(itemId);
			}
		} else if (isLikedLocally) {
			unlikeItemSilently(itemId);
		} else {
			likeItemSilently(itemId);
		}
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
					? isOutbid
						? 'Dismiss'
						: 'Remove from liked items'
					: isOutbid
						? 'Show again'
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
		showBgg && {
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
