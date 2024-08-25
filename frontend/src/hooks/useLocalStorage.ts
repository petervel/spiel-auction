import { useState } from 'react';

const useLocalStorage = <T>(
	key: string,
	defaultValue?: T,
	fromJson = false
): [T, (v: T | ((_: T) => T)) => void, () => void] => {
	const storedValue = localStorage.getItem(key);

	const getFromJson = (val: string | null) => {
		try {
			return JSON.parse(val ?? 'null');
		} catch (e) {
			console.log(e);
			return null;
		}
	};

	const initialValue = fromJson ? getFromJson(storedValue) : storedValue;

	const [value, setVal] = useState<T>(initialValue ?? defaultValue);

	const setter = (val: T | ((_: T) => T)) => {
		const v =
			typeof val === 'function' ? (val as (_T: T) => T)(value) : val;
		localStorage.setItem(key, v as string);
		setVal(v);
	};

	const remover = () => localStorage.removeItem(key);

	return [value, setter, remover];
};

export default useLocalStorage;
