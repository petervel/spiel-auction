import { Button, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { useBggUsername } from '../../hooks/useBggUsername';
// import { useUser } from '../../hooks/useUser';

export const SettingsPage = () => {
	const nav = useNavigate();

	const { bggUsername, setBggUsername, removeBggUsername } = useBggUsername();

	const [editUsername, setEditUsername] = useState(bggUsername ?? '');

	const save = (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (editUsername) {
			setBggUsername(editUsername);
		} else {
			removeBggUsername();
		}
		nav('/');
	};

	const cancel = () => nav('/');

	return (
		<Stack paddingInline="2rem">
			<Typography variant="h4" component="h1">
				Settings
			</Typography>
			<form onSubmit={save}>
				<Stack gap={3} alignItems="start">
					<TextField
						name="username"
						value={editUsername}
						onChange={(evt) => setEditUsername(evt.target.value)}
						fullWidth
						label="BGG username"
						variant="standard"
					/>
					<Stack gap={2} direction="row">
						<Button variant="contained" type="submit">
							Save
						</Button>
						<Button type="button" onClick={cancel}>
							Cancel
						</Button>
					</Stack>
				</Stack>
			</form>
		</Stack>
	);
};
