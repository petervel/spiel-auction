import { useState } from 'react';

const useLocalStorage = <T>(
	key: string,
	defaultValue: T, // Ensure defaultValue is required, so we always have a value
	fromJson = true // Default true for parsing JSON
): [T, (v: T | ((_: T) => T)) => void, () => void] => {
	// Retrieve from localStorage and parse JSON if needed
	const getStoredValue = (): T => {
		const storedValue = localStorage.getItem(key);
		if (storedValue === null) return defaultValue;
		try {
			return fromJson
				? JSON.parse(storedValue)
				: (storedValue as unknown as T);
		} catch (e) {
			console.error('Error parsing localStorage value:', e);
			return defaultValue; // If parsing fails, return the default value
		}
	};

	const [value, setVal] = useState<T>(getStoredValue());

	// Store as a JSON string in localStorage
	const setter = (val: T | ((_: T) => T)) => {
		const newValue =
			typeof val === 'function' ? (val as (_: T) => T)(value) : val;

		localStorage.setItem(key, JSON.stringify(newValue));
		setVal(newValue);
	};

	const remover = () => {
		localStorage.removeItem(key);
		setVal(defaultValue); // Reset to default value when removed
	};

	return [value, setter, remover];
};

export default useLocalStorage;
