import { Collapse, Skeleton, Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { useBookmark } from '../../hooks/useBookmark';
import { useListId } from '../../hooks/useListId';
import { usePageId } from '../../hooks/usePageId';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import AuctionItemDetails from '../AuctionItemDetails/AuctionItemDetails';
import AuctionPrice from '../AuctionPrice/AuctionPrice';
import css from './AuctionItem.module.css';
import BookmarkButton from './BookmarkButton';
import { ItemButtons } from './ItemButtons';
interface Props {
	item: Item;
	allowBookmarks?: boolean;
}

export const AuctionItem = ({ item, allowBookmarks = false }: Props) => {
	const [expanded, setExpanded] = useState(false);
	const pageId = usePageId();
	const showCompare = pageId !== 'object'; // Already in compare view.

	const { bookmark } = useBookmark();

	const toggleExpanded = () => setExpanded((val) => !val);

	const listId = useListId();

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
				<ItemButtons
					item={item}
					showCompare={showCompare}
					location="list"
					allowBookmarks={allowBookmarks}
					bookmarkClass={css.bookmark}
				/>
			</Stack>
			<Collapse in={expanded}>
				<ItemButtons
					item={item}
					showCompare={showCompare}
					location="details"
					allowBookmarks={false}
				/>

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
