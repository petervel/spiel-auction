import { Check } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useBookmark } from '../../hooks/useBookmark';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './BookmarkButton.module.css';

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
				<Check
					className={isBookmarked ? css.checked : css.unchecked}
					sx={{ fontSize: '30px' }}
				/>
			</AuctionItemButton>
		</Stack>
	);
};

export default BookmarkButton;
