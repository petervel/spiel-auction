import {
	BarChartRounded,
	Bookmark,
	BookmarkAddOutlined,
} from '@mui/icons-material';
import { Collapse, Skeleton, Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { Item } from '../../model/Item';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import AuctionPrice from '../AuctionPrice/AuctionPrice';
import css from './AuctionItem.module.css';
// import { useAuctionId } from '../../hooks/useAuctionId';
import useListId from '../../hooks/useListId';
import { usePageId } from '../../hooks/usePageId';
import AuctionItemDetails from '../AuctionItemDetails/AuctionItemDetails';
interface Props {
	item: Item;
	bookmark?: number;
	setBookmark?: () => void;
}

export const AuctionItem = ({ item, bookmark, setBookmark }: Props) => {
	const [expanded, setExpanded] = useState(false);
	const pageId = usePageId();
	const showCompare = pageId !== 'object'; // Already in compare view.

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
				})}
			>
				<AuctionItemButton
					href={`https://boardgamegeek.com/geeklist/${listId}?itemid=${item.id}`}
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
					bookmark={bookmark}
					showCompare={showCompare}
					className={css.bigScreen}
					setBookmark={setBookmark}
				/>
			</Stack>
			<Collapse in={expanded}>
				<ItemButtons
					item={item}
					bookmark={bookmark}
					showCompare={showCompare}
					className={css.smallScreen}
					setBookmark={setBookmark}
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

interface ItemButtonsProps {
	item: Item;
	bookmark?: number;
	setBookmark?: () => void;
	showCompare: boolean;
	className: string;
}

const ItemButtons = ({
	item,
	bookmark,
	setBookmark,
	showCompare,
	className,
}: ItemButtonsProps) => {
	return (
		<Stack direction="row" className={className}>
			{(bookmark ?? 0) <= item.id && (
				<div className={classNames(css.bookmark)}>
					<AuctionItemButton
						tooltip="Remember this location"
						onClick={() => setBookmark && setBookmark()}
					>
						{bookmark === item.id ? (
							<Bookmark />
						) : (
							<BookmarkAddOutlined />
						)}
					</AuctionItemButton>
				</div>
			)}
			{showCompare && (
				<AuctionItemButton
					href={`/object/${item.objectId}`}
					tooltip="Compare with other auctions"
				>
					<BarChartRounded
						className="icon"
						sx={{ fontSize: '30px' }}
					/>
				</AuctionItemButton>
			)}
			<AuctionItemButton
				href={`https://boardgamegeek.com/${item.objectSubtype}/${item.objectId}`}
				tooltip="Look up on BGG"
			>
				<img src={bggIcon} width="30" height="30" />
			</AuctionItemButton>
		</Stack>
	);
};
