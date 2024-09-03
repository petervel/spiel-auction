import { Button, Grid, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import useLocalStorage from '../hooks/useLocalStorage';

const SettingsPage = () => {
	const nav = useNavigate();
	const [storedUsername, setUsername, removeUsername] =
		useLocalStorage<string>('bgg_username');

	const [editUsername, setEditUsername] = useState(storedUsername ?? '');

	const save = (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (editUsername) {
			setUsername(editUsername);
		} else {
			removeUsername();
		}
		nav('/');
	};

	return (
		<Stack>
			<Typography variant="h4" component="h1">
				Settings
			</Typography>
			<form onSubmit={save}>
				<Grid container spacing={2} style={{ width: '100%' }}>
					<Grid item xs={12} sm={6}>
						<TextField
							name="username"
							value={editUsername}
							onChange={(evt) =>
								setEditUsername(evt.target.value)
							}
							fullWidth
							label="BGG username"
							variant="standard"
						/>
					</Grid>
					<Grid item xs={0} sm={6}></Grid>
					<Grid item xs={12} sm={6}>
						<Button type="submit">Save</Button>
					</Grid>
				</Grid>
			</form>
		</Stack>
	);
};

export default SettingsPage;
