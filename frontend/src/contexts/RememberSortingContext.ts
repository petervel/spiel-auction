import { createContext } from 'react';

export interface RememberSortingContextProps {
	rememberSorting: boolean;
	setRememberSorting: (value: boolean) => void;
}

export const RememberSortingContext = createContext<
	RememberSortingContextProps | undefined
>(undefined);
