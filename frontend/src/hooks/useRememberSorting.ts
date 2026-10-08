import { useContext } from 'react';
import { RememberSortingContext } from '../contexts/RememberSortingContext';

export const useRememberSorting = () => {
	const context = useContext(RememberSortingContext);
	if (!context) {
		throw new Error(
			'useRememberSorting must be used within a RememberSortingProvider'
		);
	}
	return context;
};
