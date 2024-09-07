import useLocalStorage from './useLocalStorage';

export const useBggUsername = () => {
	const [username] = useLocalStorage<string>('bgg_username');
	return username ? username.toLowerCase() : undefined;
};
