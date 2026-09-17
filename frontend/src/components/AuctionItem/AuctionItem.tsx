import { Collapse, Skeleton, Stack, useMediaQuery } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { useBookmark } from '../../hooks/useBookmark';
import { useListId } from '../../hooks/useListId';
import { usePageId } from '../../hooks/usePageId';
import { useUser } from '../../hooks/useUser';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import AuctionItemDetails from '../AuctionItemDetails/AuctionItemDetails';
import AuctionPrice from '../AuctionPrice/AuctionPrice';
import css from './AuctionItem.module.css';
import BookmarkButton from './BookmarkButton';
import { ItemDisplayOptions } from './ItemDisplayOptions';
import { ItemButtons } from './ItemButtons';
interface Props {
	item: Item;
	// Which of `items` are currently outbid - only meaningful together with
	// silentToggle, to pick the broken-heart icon for this specific item.
	isOutbid?: boolean;
	options?: ItemDisplayOptions;
}

export const AuctionItem = ({ item, isOutbid = false, options = {} }: Props) => {
	const {
		allowBookmarks = false,
		allowLikes = false,
		silentToggle = false,
		startExpanded = false,
		allowObjectActions = true,
	} = options;

	const [expanded, setExpanded] = useState(startExpanded);
	const pageId = usePageId();
	// The "Outbid & Liked" page wants only the heart while collapsed - the
	// object-level compare/BGG links would just be noise in an at-a-glance
	// list - but restores them once a row is expanded, alongside the
	// auction details. Already in compare view for the object-page case.
	const showObjectActions = allowObjectActions && (!silentToggle || expanded);
	const showCompare = showObjectActions && pageId !== 'object';
	const showBgg = showObjectActions;

	const { user } = useUser();

	const { bookmark } = useBookmark();

	const toggleExpanded = () => setExpanded((val) => !val);

	const listId = useListId();

	// Matches the old .bigScreen/.smallScreen breakpoint: buttons show
	// inline in the collapsed row on desktop, or only once expanded on
	// mobile. Rendered in exactly one of those two spots below, instead
	// of rendering both and hiding one with CSS.
	const isDesktop = useMediaQuery('(min-width:768px)');
	// The "Outbid & Liked" page's whole point is seeing at a glance what's
	// what, so its (broken) heart always shows inline there, even on mobile
	// where every other page hides these buttons until the row is expanded.
	const showButtonsInline = isDesktop || silentToggle;
	const showLike = allowLikes && user !== null;

	return (
		<div
			className={classNames({
				item: true,
				[css.container]: true,
				[css.ended]: item.isEnded,
				[css.bookmarked]: allowBookmarks && bookmark == item.id,
				[css.seen]: allowBookmarks && bookmark && item.id < bookmark,
			})}
		>
			<Stack direction="row" gap={1}>
				{allowBookmarks && (
					<div
						className={classNames({
							[css.sideBookmark]: true,
							[css.activeBookmark]: bookmark == item.id,
						})}
					>
						<BookmarkButton
							itemId={item.id}
							className={css.bookmark}
						/>
					</div>
				)}
				<AuctionItemButton
					className={css.price}
					link={`https://boardgamegeek.com/geeklist/${listId}?itemid=${item.id}`}
					newTab
				>
					<AuctionPrice item={item} />
				</AuctionItemButton>
				<div className={css.info} onClick={toggleExpanded}>
					<div className={classNames(css.name, css.hideOverflow)}>
						{item.objectName}
					</div>
					<div className={classNames(css.details, css.hideOverflow)}>
						{[item.language, item.auctionEnd, item.condition]
							.filter((v) => !!v)
							.join(' · ')}
					</div>
				</div>
				{allowBookmarks && (
					<div className={css.inlineBookmark}>
						<BookmarkButton
							itemId={item.id}
							className={css.bookmark}
						/>
					</div>
				)}
				{showButtonsInline && (
					<ItemButtons
						item={item}
						showCompare={showCompare}
						showBgg={showBgg}
						showLike={showLike}
						silentToggle={silentToggle}
						isOutbid={isOutbid}
					/>
				)}
			</Stack>
			<Collapse in={expanded}>
				{!showButtonsInline && (
					<ItemButtons
						item={item}
						showCompare={showCompare}
						showBgg={showBgg}
						showLike={showLike}
						silentToggle={silentToggle}
						isOutbid={isOutbid}
					/>
				)}

				<AuctionItemDetails item={item} />
			</Collapse>
		</div>
	);
};
type AuctionItemSkeletonProps = {
	opacity?: number;
};
export const AuctionItemSkeleton = ({
	opacity = 1,
}: AuctionItemSkeletonProps) => {
	return (
		<Stack
			direction="row"
			className={css.skeleton}
			gap={2}
			style={{ opacity }}
		>
			<Skeleton height={50} width={50} />
			<Stack style={{ flex: 1 }}>
				<Skeleton />
				<Skeleton />
				<Skeleton />
			</Stack>
		</Stack>
	);
};
