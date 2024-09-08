import { Button, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import css from './EditBggUserName.module.css';

type EditBggUserNameProps = {
	onSave: (value: string | undefined) => void;
};
export const EditBggUserName = ({ onSave }: EditBggUserNameProps) => {
	const [storedUsername, setUsername, removeUsername] = useLocalStorage<
		string | undefined
	>('bgg_username', undefined);

	const [editUsername, setEditUsername] = useState(storedUsername ?? '');

	const save = (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (editUsername) {
			setUsername(editUsername);
			onSave(editUsername);
		} else {
			removeUsername();
			onSave(undefined);
		}
	};

	return (
		<form onSubmit={save} className={css.form}>
			<TextField
				name="username"
				value={editUsername}
				onChange={(evt) => setEditUsername(evt.target.value)}
				fullWidth
				label="BGG username"
				variant="standard"
			/>
			<Button type="submit">Save</Button>
		</form>
	);
	return <div>EditBggUserName</div>;
};
