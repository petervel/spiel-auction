import { useContext } from 'react';
import { BookmarkContext } from '../contexts/BookmarkContext';

export const useBookmark = () => {
	const context = useContext(BookmarkContext);
	if (!context) {
		throw new Error('useBookmarks must be used within a BookmarkProvider');
	}
	return context;
};
