import EditIcon from '@mui/icons-material/Edit';
import {
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	IconButton,
	MenuItem,
	Snackbar,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useCurrentFair } from '../../hooks/useCurrentFair';
import { useFairs } from '../../hooks/useFairs';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useUser } from '../../hooks/useUser';

export const SettingsPage = () => {
	const { user, isLoading: userLoading } = useUser();

	const { bggUsername, setBggUsername, removeBggUsername, saving } =
		useBggUsername();

	const { data: fairs } = useFairs();
	const {
		currentFairId,
		switchFair,
		saving: switchingFair,
	} = useCurrentFair();

	const {
		supported: pushSupported,
		needsHomeScreenInstall,
		permission: pushPermission,
		subscribed: pushSubscribed,
		saving: pushSaving,
		subscribe: subscribePush,
		unsubscribe: unsubscribePush,
		testSending: pushTestSending,
		sendTest: sendTestPush,
	} = usePushSubscription();

	const {
		preferences: notificationPreferences,
		setPreferences: setNotificationPreferences,
		saving: preferencesSaving,
	} = useNotificationPreferences();

	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const handleFairChange = async (fairId: number) => {
		const succeeded = await switchFair(fairId);
		if (succeeded) {
			const fair = fairs?.find((f) => f.id === fairId);
			setToastMessage(
				fair ? `Switched to ${fair.name}` : 'Fair switched'
			);
		}
	};

	const togglePreference = (key: keyof typeof notificationPreferences) =>
		setNotificationPreferences({
			...notificationPreferences,
			[key]: !notificationPreferences[key],
		});

	const handleTestPush = async () => {
		const succeeded = await sendTestPush();
		setToastMessage(
			succeeded
				? 'Test notification sent'
				: 'Failed to send test notification'
		);
	};

	// Editing opens automatically once we know there's nothing to display -
	// can't derive this from useState's initializer, since bggUsername is
	// still undefined on the first render (before the user finishes
	// loading) and that initial value would stick forever.
	const [editingUsername, setEditingUsername] = useState(false);
	const [editUsername, setEditUsername] = useState(bggUsername ?? '');
	useEffect(() => {
		if (!saving) {
			setEditUsername(bggUsername ?? '');
		}
	}, [bggUsername, saving]);
	useEffect(() => {
		if (!userLoading && !bggUsername) {
			setEditingUsername(true);
		}
	}, [userLoading, bggUsername]);

	const save = async (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (editUsername) {
			await setBggUsername(editUsername);
		} else {
			await removeBggUsername();
		}
		setEditingUsername(false);
	};

	const cancel = () => {
		setEditUsername(bggUsername ?? '');
		setEditingUsername(false);
	};

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
					{editingUsername ? (
						<form onSubmit={save} style={{ width: '100%' }}>
							<Stack gap={3} alignItems="start">
								<TextField
									name="username"
									value={editUsername}
									onChange={(evt) =>
										setEditUsername(evt.target.value)
									}
									autoFocus
									fullWidth
									label="BGG username"
									variant="standard"
								/>
								<Stack gap={2} direction="row">
									<Button variant="contained" type="submit">
										Save
									</Button>
									{bggUsername && (
										<Button type="button" onClick={cancel}>
											Cancel
										</Button>
									)}
								</Stack>
							</Stack>
						</form>
					) : (
						<Stack
							direction="row"
							alignItems="center"
							gap={1}
							width="100%"
						>
							<Typography flexGrow={1}>
								BGG username: {bggUsername}
							</Typography>
							<IconButton
								size="small"
								aria-label="Edit BGG username"
								onClick={() => setEditingUsername(true)}
							>
								<EditIcon fontSize="small" />
							</IconButton>
						</Stack>
					)}
					{pushSupported && (
						<>
							<Divider sx={{ width: '100%' }} />
							<Stack gap={1} alignItems="start">
								<Typography variant="body2">
									Get notified about your auctions.
								</Typography>
								{needsHomeScreenInstall && (
									<Typography
										variant="body2"
										color="text.secondary"
									>
										Add this app to your home screen first -
										iOS only allows notifications for
										installed apps.
									</Typography>
								)}
								{pushPermission === 'denied' ? (
									<Typography
										variant="body2"
										color="text.secondary"
									>
										Notifications are blocked for this site
										in your browser settings.
									</Typography>
								) : pushSubscribed ? (
									<>
										<Typography
											variant="body2"
											color="text.secondary"
										>
											Notifications are enabled on this
											device.
										</Typography>
										<Stack>
											<Typography variant="body2">
												Notify me about:
											</Typography>
											<FormControlLabel
												control={
													<Checkbox
														checked={
															notificationPreferences.notifyOnOutbid
														}
														disabled={
															preferencesSaving
														}
														onChange={() =>
															togglePreference(
																'notifyOnOutbid'
															)
														}
													/>
												}
												label="Outbid on an item"
											/>
											<FormControlLabel
												control={
													<Checkbox
														checked={
															notificationPreferences.notifyOnNewBid
														}
														disabled={
															preferencesSaving
														}
														onChange={() =>
															togglePreference(
																'notifyOnNewBid'
															)
														}
													/>
												}
												label="New bids on my auctions"
											/>
											<FormControlLabel
												control={
													<Checkbox
														checked={
															notificationPreferences.notifyOnAuctionWon
														}
														disabled={
															preferencesSaving
														}
														onChange={() =>
															togglePreference(
																'notifyOnAuctionWon'
															)
														}
													/>
												}
												label="Auctions I've won"
											/>
										</Stack>
										<Stack gap={2} direction="row">
											<Button
												type="button"
												disabled={pushTestSending}
												onClick={handleTestPush}
											>
												Send test notification
											</Button>
											<Button
												type="button"
												disabled={pushSaving}
												onClick={unsubscribePush}
											>
												Turn off notifications
											</Button>
										</Stack>
									</>
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
				open={!!toastMessage}
				autoHideDuration={4000}
				onClose={() => setToastMessage(null)}
				message={toastMessage}
			/>
		</Stack>
	);
};
