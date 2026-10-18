import { ReactNode } from 'react';
import { RememberSortingContext } from '../contexts/RememberSortingContext';
import useLocalStorage from '../hooks/useLocalStorage';

export const RememberSortingProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [rememberSorting, setRememberSorting] = useLocalStorage<boolean>(
		'rememberSorting',
		true
	);

	return (
		<RememberSortingContext.Provider
			value={{ rememberSorting, setRememberSorting }}
		>
			{children}
		</RememberSortingContext.Provider>
	);
};
