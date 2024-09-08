import { useState } from 'react';

const useLocalStorage = <T>(
	key: string,
	defaultValue?: T,
	fromJson = true // Default true for parsing JSON
): [
	T | undefined,
	(v: T | ((_: T | undefined) => T | undefined)) => void,
	() => void
] => {
	// Retrieve from localStorage and parse JSON if needed
	const getStoredValue = (): T | undefined => {
		const storedValue = localStorage.getItem(key);
		if (storedValue === null) return undefined;
		try {
			return fromJson
				? JSON.parse(storedValue)
				: (storedValue as unknown as T);
		} catch (e) {
			console.error('Error parsing localStorage value:', e);
			return undefined;
		}
	};

	const [value, setVal] = useState<T | undefined>(
		getStoredValue() ?? defaultValue
	);

	// Store as a JSON string in localStorage
	const setter = (val: T | ((_: T | undefined) => T | undefined)) => {
		const newValue =
			typeof val === 'function'
				? (val as (_: T | undefined) => T | undefined)(value)
				: val;

		if (newValue !== undefined) {
			localStorage.setItem(key, JSON.stringify(newValue));
		} else {
			localStorage.removeItem(key);
		}
		setVal(newValue);
	};

	const remover = () => {
		localStorage.removeItem(key);
		setVal(undefined);
	};

	return [value, setter, remover];
};

export default useLocalStorage;
