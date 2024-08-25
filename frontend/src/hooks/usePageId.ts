import { useLocation } from 'react-router-dom';

export const usePageId = () => {
	const location = useLocation();
	const parts = location.pathname.split('/');
	const path = parts[1] != '' ? parts[1] : 'latest';
	return path;
};
