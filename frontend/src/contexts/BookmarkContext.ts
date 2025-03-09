import { createContext } from 'react';

export interface BookmarkContextProps {
	bookmark: number | undefined;
	setBookmark: (bookmark: number) => void;
	clearBookmark: () => void;
}

export const BookmarkContext = createContext<BookmarkContextProps | undefined>(
	undefined
);
