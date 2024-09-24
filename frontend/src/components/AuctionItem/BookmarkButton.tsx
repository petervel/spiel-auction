import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useBookmark } from '../../hooks/useBookmark';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './BookmarkButton.module.css';

type BookmarkButtonProps = {
	itemId: number;
	className?: string;
};
const BookmarkButton = ({ itemId, className = '' }: BookmarkButtonProps) => {
	const { bookmark, setBookmark, clearBookmark } = useBookmark();

	const isBookmarked = bookmark === itemId;
	const handleBookmark = () => {
		if (isBookmarked) {
			clearBookmark();
		} else {
			setBookmark(itemId);
		}
	};

	return (
		<Stack className={className} justifyContent="center">
			<AuctionItemButton
				tooltip="Remember this location"
				link={handleBookmark}
			>
				<div
					className={classNames(
						css.iconContainer,
						isBookmarked ? css.checked : css.unchecked
					)}
				/>
			</AuctionItemButton>
		</Stack>
	);
};

export default BookmarkButton;
