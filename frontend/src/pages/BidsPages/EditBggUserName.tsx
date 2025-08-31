import { Button, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useBggUsername } from '../../hooks/useBggUsername';
import css from './EditBggUserName.module.css';

type EditBggUserNameProps = {
	onSave: (value: string | undefined) => void;
};
export const EditBggUserName = ({ onSave }: EditBggUserNameProps) => {
	const { bggUsername, setBggUsername, removeBggUsername } = useBggUsername();

	const [editUsername, setEditUsername] = useState(bggUsername ?? '');

	const save = (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (editUsername) {
			setBggUsername(editUsername);
			onSave(editUsername);
		} else {
			removeBggUsername();
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
};
