import { useState } from 'react';

const useLocalStorage = <T>(
	key: string,
	defaultValue?: T,
	fromJson = false
): [
	T | undefined,
	(v: T | ((_: T | undefined) => T | undefined)) => void,
	() => void
] => {
	const storedValue = localStorage.getItem(key) ?? undefined;

	const getFromJson = (val: string | undefined): T | undefined => {
		try {
			if (val !== undefined) return JSON.parse(val);
		} catch (e) {
			console.log(e);
		}
		return undefined;
	};

	const initialValue: T | undefined = fromJson
		? getFromJson(storedValue)
		: (storedValue as T | undefined);

	const [value, setVal] = useState<T | undefined>(
		initialValue ?? defaultValue
	);

	const setter = (val: T | ((_: T | undefined) => T | undefined)) => {
		const v =
			typeof val === 'function'
				? (val as (_T: T | undefined) => T | undefined)(value)
				: val;
		localStorage.setItem(key, v as string);
		setVal(v);
	};

	const remover = () => localStorage.removeItem(key);

	return [value, setter, remover];
};

export default useLocalStorage;
