import { ReactNode, useEffect, useState } from 'react';
import {
	BookmarkContext,
	BookmarkContextProps,
} from '../contexts/BookmarkContext';
import useLocalStorage from '../hooks/useLocalStorage';
import { useUser } from '../hooks/useUser';

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
	const [bookmarkLS, setBookmarkLS, clearBookmarkLS] =
		useLocalStorage<number>('bookmark', 0);

	const { user } = useUser();

	const loadBookmark = () =>
		user?.currentUserFair
			? user.currentUserFair.bookmark ?? bookmarkLS
			: bookmarkLS;

	const [bookmark, setBookmarkState] = useState(loadBookmark());

	useEffect(() => {
		setBookmarkState(loadBookmark());
	}, [user]);

	const setBookmark = async (newBookmark: number) => {
		if (user) {
			await fetch('/api/user/bookmark', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bookmark: newBookmark }),
			});
		}
		setBookmarkLS(newBookmark);
		setBookmarkState(newBookmark);
	};
	const clearBookmark = async () => {
		if (user) {
			await fetch('/api/user/bookmark', {
				method: 'DELETE',
			});
		}
		clearBookmarkLS();
		setBookmarkState(0);
	};
	console.log('bookmark', bookmark);

	const value: BookmarkContextProps = {
		bookmark,
		setBookmark,
		clearBookmark,
	};

	return (
		<BookmarkContext.Provider value={value}>
			{children}
		</BookmarkContext.Provider>
	);
};
