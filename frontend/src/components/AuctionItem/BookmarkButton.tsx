import { Bookmark, BookmarkAddOutlined } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useBookmark } from '../../hooks/useBookmark';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

type BookmarkButtonProps = {
	itemId: number;
};
const BookmarkButton = ({ itemId }: BookmarkButtonProps) => {
	const { bookmark, setBookmark, clearBookmark } = useBookmark();

	console.log({ bookmark, itemId });
	const isBookmarked = bookmark === itemId;
	const handleBookmark = () => {
		if (isBookmarked) {
			clearBookmark();
		} else {
			setBookmark(itemId);
		}
	};

	return (
		<Stack className={classNames('bookmark')} justifyContent="center">
			<AuctionItemButton
				tooltip="Remember this location"
				link={handleBookmark}
			>
				{isBookmarked ? <Bookmark /> : <BookmarkAddOutlined />}
			</AuctionItemButton>
		</Stack>
	);
};

export default BookmarkButton;
