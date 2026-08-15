import { Button, Link, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useUser } from '../../hooks/useUser';

export const SettingsPage = () => {
	const nav = useNavigate();
	const { user, isLoading: userLoading, openLoginDialog } = useUser();

	const { bggUsername, setBggUsername, removeBggUsername, saving } =
		useBggUsername();

	const [editUsername, setEditUsername] = useState(bggUsername ?? '');
	useEffect(() => {
		if (!saving) {
			setEditUsername(bggUsername ?? '');
		}
	}, [bggUsername, saving]);

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

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Stack paddingInline="2rem">
				<Typography variant="h4" component="h1">
					Settings
				</Typography>
				<p>
					<Link component="button" onClick={openLoginDialog}>
						Log in
					</Link>{' '}
					to manage your BGG username.
				</p>
			</Stack>
		);
	}

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
