import {
	Button,
	Divider,
	MenuItem,
	Snackbar,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useCurrentFair } from '../../hooks/useCurrentFair';
import { useFairs } from '../../hooks/useFairs';
import { useUser } from '../../hooks/useUser';

export const SettingsPage = () => {
	const nav = useNavigate();
	const { user, isLoading: userLoading } = useUser();

	const { bggUsername, setBggUsername, removeBggUsername, saving } =
		useBggUsername();

	const { data: fairs } = useFairs();
	const { currentFairId, switchFair, saving: switchingFair } =
		useCurrentFair();

	const [switchedToastMessage, setSwitchedToastMessage] = useState<
		string | null
	>(null);

	const handleFairChange = async (fairId: number) => {
		const succeeded = await switchFair(fairId);
		if (succeeded) {
			const fair = fairs?.find((f) => f.id === fairId);
			setSwitchedToastMessage(
				fair ? `Switched to ${fair.name}` : 'Fair switched'
			);
		}
	};

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
					<LoginLink /> to manage your BGG username.
				</p>
			</Stack>
		);
	}

	return (
		<Stack paddingInline="2rem" alignItems="center">
			<Stack gap={4} width="100%" maxWidth={400}>
				<Typography variant="h4" component="h1">
					Settings
				</Typography>
				{fairs && fairs.length > 1 && (
					<>
						<TextField
							select
							value={currentFairId ?? ''}
							onChange={(evt) => handleFairChange(+evt.target.value)}
							disabled={switchingFair}
							fullWidth
							label="Active fair"
							variant="standard"
						>
							{fairs.map((fair) => (
								<MenuItem key={fair.id} value={fair.id}>
									{fair.name}
								</MenuItem>
							))}
						</TextField>
						<Divider sx={{ width: '100%' }} />
					</>
				)}
				<form onSubmit={save} style={{ width: '100%' }}>
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
			<Snackbar
				open={!!switchedToastMessage}
				autoHideDuration={4000}
				onClose={() => setSwitchedToastMessage(null)}
				message={switchedToastMessage}
			/>
		</Stack>
	);
};
