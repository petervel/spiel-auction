import { Collapse, Skeleton, Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import AuctionPrice from '../AuctionPrice/AuctionPrice';
import css from './AuctionItem.module.css';
// import { useAuctionId } from '../../hooks/useAuctionId';
import { useBookmark } from '../../hooks/useBookmark';
import useListId from '../../hooks/useListId';
import { usePageId } from '../../hooks/usePageId';
import AuctionItemDetails from '../AuctionItemDetails/AuctionItemDetails';
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
		<div className={css.container}>
			<Stack
				direction="row"
				gap={1}
				className={classNames({
					[css.ended]: item.isEnded,
					[css.bookmarked]: bookmark == item.id,
					[css.seen]: bookmark && item.id < bookmark,
				})}
			>
				{allowBookmarks && (
					<div className={css.sideBookmark}>
						<BookmarkButton itemId={item.id} />
					</div>
				)}
				<AuctionItemButton
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
