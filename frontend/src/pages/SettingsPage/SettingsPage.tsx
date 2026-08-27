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
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useCurrentFair } from '../../hooks/useCurrentFair';
import { useFairs } from '../../hooks/useFairs';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useUser } from '../../hooks/useUser';

export const SettingsPage = () => {
	const nav = useNavigate();
	const { user, isLoading: userLoading } = useUser();

	const { bggUsername, setBggUsername, removeBggUsername, saving } =
		useBggUsername();

	const { data: fairs } = useFairs();
	const { currentFairId, switchFair, saving: switchingFair } =
		useCurrentFair();

	const {
		supported: pushSupported,
		permission: pushPermission,
		subscribed: pushSubscribed,
		saving: pushSaving,
		subscribe: subscribePush,
		unsubscribe: unsubscribePush,
	} = usePushSubscription();

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
				<Title title="Settings" left={<BackButton />} />
				<p>
					<LoginLink /> to manage your BGG username.
				</p>
			</Stack>
		);
	}

	return (
		<Stack paddingInline="2rem">
			<Title title="Settings" left={<BackButton />} />
			<Stack alignItems="center">
				<Stack gap={4} width="100%" maxWidth={400}>
					{fairs && fairs.length > 1 && (
						<>
							<TextField
								select
								value={currentFairId ?? ''}
								onChange={(evt) =>
									handleFairChange(+evt.target.value)
								}
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
								onChange={(evt) =>
									setEditUsername(evt.target.value)
								}
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
					{pushSupported && (
						<>
							<Divider sx={{ width: '100%' }} />
							<Stack gap={1} alignItems="start">
								<Typography variant="body2">
									Get notified when you're outbid. On iOS,
									add this app to your home screen first
									for notifications to work.
								</Typography>
								{pushPermission === 'denied' ? (
									<Typography
										variant="body2"
										color="text.secondary"
									>
										Notifications are blocked for this
										site in your browser settings.
									</Typography>
								) : pushSubscribed ? (
									<Button
										type="button"
										disabled={pushSaving}
										onClick={unsubscribePush}
									>
										Turn off notifications
									</Button>
								) : (
									<Button
										type="button"
										variant="contained"
										disabled={pushSaving}
										onClick={subscribePush}
									>
										Enable notifications
									</Button>
								)}
							</Stack>
						</>
					)}
				</Stack>
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
