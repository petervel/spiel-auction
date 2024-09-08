import { ReactNode, createContext } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

interface BookmarkContextProps {
	bookmark: number | undefined;
	setBookmark: (bookmark: number) => void;
	clearBookmark: () => void;
}

export const BookmarkContext = createContext<BookmarkContextProps | undefined>(
	undefined
);

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
