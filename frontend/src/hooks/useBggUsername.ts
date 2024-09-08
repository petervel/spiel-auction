import useLocalStorage from './useLocalStorage';

export const useBggUsername = () => {
	const [username] = useLocalStorage<string | undefined>(
		'bgg_username',
		undefined
	);
	return username ? username.toLowerCase() : undefined;
};
