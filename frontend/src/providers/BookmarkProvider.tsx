import React, { ReactNode } from 'react';
import {
	BookmarkContext,
	BookmarkContextProps,
} from '../contexts/BookmarkContext';
import useLocalStorage from '../hooks/useLocalStorage';

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
	const [bookmark, setBookmark, clearBookmark] = useLocalStorage<number>(
		'bookmark',
		0
	);

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
