import useLocalStorage from './useLocalStorage';

export const useBggUsername = () => {
	const [bggUsername, setBggUsername] = useLocalStorage<string | undefined>(
		'bgg_username',
		undefined
	);
	return {
		bggUsername: bggUsername ? bggUsername.toLowerCase() : undefined,
		setBggUsername,
	};
};
