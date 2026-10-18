import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
	Box,
	Button,
	Checkbox,
	Chip,
	FormControlLabel,
	IconButton,
	MenuItem,
	Snackbar,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { MeetupSpotSummary } from '../../components/MeetupSpotSummary/MeetupSpotSummary';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useCurrentFair } from '../../hooks/useCurrentFair';
import { useFairs } from '../../hooks/useFairs';
import { useGeekmailSettings } from '../../hooks/useGeekmailSettings';
import { MeetupDay } from '../../hooks/useMeetups';
import { useMeetupLocation } from '../../hooks/useMeetupLocation';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { useRememberSorting } from '../../hooks/useRememberSorting';
import { useUser } from '../../hooks/useUser';
import { DAY_LABELS, DAY_ORDER } from '../MeetupsPage/meetupDisplay';

// Groups each setting into its own visually distinct block instead of
// stringing them together behind plain dividers.
const sectionSx = {
	border: '1px solid',
	borderColor: 'divider',
	borderRadius: 2,
	padding: 2,
} as const;

type TabKey = 'account' | 'meetup' | 'notifications' | 'general';

export const SettingsPage = () => {
	const { user, isLoading: userLoading } = useUser();

	const {
		bggUsername,
		setBggUsername,
		removeBggUsername,
		saving,
		verification,
		verifying,
		fetchVerification,
		startVerification,
		checkVerification,
	} = useBggUsername();

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

	const { square: meetupSquare, description: meetupDescription } =
		useMeetupLocation();

	const { rememberSorting, setRememberSorting } = useRememberSorting();

	const {
		settings: geekmailSettings,
		setSettings: setGeekmailSettings,
		saving: geekmailSaving,
	} = useGeekmailSettings();

	const [toastMessage, setToastMessage] = useState<string | null>(null);

	// Notifications only appears once push is actually usable (same
	// condition the section itself was already gated on) - no point
	// offering a tab that'd just be empty.
	const tabs: { key: TabKey; label: string }[] = [
		{ key: 'account', label: 'Account' },
		{ key: 'meetup', label: 'Meetups' },
		...(pushSupported
			? [{ key: 'notifications' as const, label: 'Notifications' }]
			: []),
		{ key: 'general', label: 'General' },
	];
	const [tab, setTab] = useState<TabKey>('account');

	// Collapsed by default - two full-size templates plus the day picker
	// make this by far the tallest section on the page, so it shouldn't
	// dominate everyone else's settings just to be visible.
	const [templatesOpen, setTemplatesOpen] = useState(false);

	// Drafted locally and only sent on Save (not per keystroke/toggle) -
	// these are free text plus a multi-select, not a single flip like the
	// other settings on this page, so autosaving every change would mean a
	// request per keystroke.
	const [draftTradeDays, setDraftTradeDays] = useState<MeetupDay[]>(
		geekmailSettings.preferredTradeDays,
	);
	const [draftSellerTemplate, setDraftSellerTemplate] = useState(
		geekmailSettings.sellerMessageTemplate,
	);
	const [draftBuyerTemplate, setDraftBuyerTemplate] = useState(
		geekmailSettings.buyerMessageTemplate,
	);

	const saveGeekmailSettings = () => {
		setGeekmailSettings({
			preferredTradeDays: draftTradeDays,
			sellerMessageTemplate: draftSellerTemplate,
			buyerMessageTemplate: draftBuyerTemplate,
		});
		setToastMessage('Geekmail templates saved');
	};

	const handleFairChange = async (fairId: number) => {
		const succeeded = await switchFair(fairId);
		if (succeeded) {
			const fair = fairs?.find((f) => f.id === fairId);
			setToastMessage(
				fair ? `Switched to ${fair.name}` : 'Fair switched',
			);
		}
	};

	const togglePreference = (key: keyof typeof notificationPreferences) =>
		setNotificationPreferences({
			...notificationPreferences,
			[key]: !notificationPreferences[key],
		});

	useEffect(() => {
		if (bggUsername) fetchVerification();
	}, [bggUsername, fetchVerification]);

	const handleCheckVerification = async () => {
		const { confirmed, unreachable } = await checkVerification();
		if (confirmed) {
			setToastMessage('BGG username verified');
		} else if (unreachable) {
			setToastMessage("Couldn't reach BGG - try again in a moment");
		} else {
			setToastMessage(
				'Not found yet - comments can take a minute to show up on BGG',
			);
		}
	};

	const handleTestPush = async () => {
		const succeeded = await sendTestPush();
		setToastMessage(
			succeeded
				? 'Test notification sent'
				: 'Failed to send test notification',
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
			<Stack
				paddingInline="2rem"
				paddingBottom="2rem"
				sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
			>
				<Title title="Settings" left={<BackButton />} />
				<p>
					<LoginLink /> to manage your BGG username.
				</p>
			</Stack>
		);
	}

	return (
		<Stack
			paddingInline="2rem"
			paddingBottom="2rem"
			gap={3}
			sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
		>
			<Title title="Settings" left={<BackButton />} />

			<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
				<Tabs
					value={tab}
					onChange={(_, value) => setTab(value)}
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
				>
					{tabs.map((t) => (
						<Tab key={t.key} value={t.key} label={t.label} />
					))}
				</Tabs>
			</Box>

			{tab === 'account' && (
				<>
					{fairs && fairs.length > 1 && (
						<Stack gap={1.5} sx={sectionSx}>
							<Typography
								variant="subtitle2"
								color="text.secondary"
							>
								Fair
							</Typography>
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
						</Stack>
					)}

					<Stack gap={1.5} sx={sectionSx}>
						<Typography variant="subtitle2" color="text.secondary">
							BGG Username
						</Typography>
						{editingUsername ? (
							<form onSubmit={save} style={{ width: '100%' }}>
								<Stack gap={2} alignItems="start">
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
										<Button
											variant="contained"
											type="submit"
										>
											Save
										</Button>
										{bggUsername && (
											<Button
												type="button"
												onClick={cancel}
											>
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
									{bggUsername}
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
						{!editingUsername && bggUsername && (
							<Stack gap={1} alignItems="start" width="100%">
								{verification?.confirmed ? (
									<Chip
										color="success"
										size="small"
										icon={<CheckCircleIcon />}
										label="BGG username verified"
									/>
								) : verification?.exists ? (
									<>
										<Chip
											color="warning"
											size="small"
											label="BGG username not verified"
										/>
										<Typography variant="body2">
											Post this code as a reply on{' '}
											<a
												href="https://boardgamegeek.com/thread/3773437"
												target="_blank"
											>
												this BGG thread
											</a>{' '}
											to prove you own this account:
										</Typography>
										<Stack
											direction="row"
											alignItems="center"
											gap={1}
										>
											<Typography
												component="code"
												sx={{
													fontFamily: 'monospace',
													bgcolor: 'action.hover',
													px: 1,
													py: 0.5,
													borderRadius: 1,
												}}
											>
												{verification.hash}
											</Typography>
											<IconButton
												size="small"
												aria-label="Copy code"
												onClick={() =>
													navigator.clipboard.writeText(
														verification.hash ?? '',
													)
												}
											>
												<ContentCopyIcon fontSize="small" />
											</IconButton>
										</Stack>
										<Button
											type="button"
											variant="contained"
											size="small"
											disabled={verifying}
											onClick={handleCheckVerification}
										>
											Check confirmation
										</Button>
									</>
								) : (
									<Button
										type="button"
										size="small"
										disabled={verifying}
										onClick={startVerification}
									>
										Verify BGG username ownership
									</Button>
								)}
							</Stack>
						)}
					</Stack>
				</>
			)}

			{tab === 'meetup' && (
				<>
					<Stack gap={1.5} sx={sectionSx}>
						<Typography variant="subtitle2" color="text.secondary">
							Meetup
						</Typography>
						<Stack
							direction="row"
							alignItems="center"
							gap={1}
							width="100%"
						>
							<MeetupSpotSummary
								square={meetupSquare}
								description={meetupDescription}
							/>
							<IconButton
								size="small"
								aria-label="Edit meetup location"
								component={Link}
								to="/settings/location"
							>
								<EditIcon fontSize="small" />
							</IconButton>
						</Stack>
					</Stack>

					<Stack gap={1.5} sx={sectionSx}>
						<Stack
							direction="row"
							alignItems="center"
							justifyContent="space-between"
							component="button"
							type="button"
							onClick={() => setTemplatesOpen((open) => !open)}
							aria-expanded={templatesOpen}
							sx={{
								background: 'none',
								border: 'none',
								padding: 0,
								margin: 0,
								width: '100%',
								cursor: 'pointer',
								textAlign: 'left',
								font: 'inherit',
								color: 'inherit',
							}}
						>
							<Typography
								variant="subtitle2"
								color="text.secondary"
							>
								Geekmail templates
							</Typography>
							<ExpandMoreRoundedIcon
								fontSize="small"
								sx={{
									color: 'text.secondary',
									transform: templatesOpen
										? 'rotate(180deg)'
										: 'none',
									transition: 'transform 0.15s',
								}}
							/>
						</Stack>

						{templatesOpen && (
							<>
								<Typography variant="body2">
									Used to pre-fill a BGG geekmail when you tap
									"Send message" on a meetup. Different
									wording for people buying from you vs.
									people you're buying from.
								</Typography>

								<Stack gap={0.5}>
									<Typography variant="body2">
										Preferred trade day(s)
									</Typography>
									<Stack
										direction="row"
										gap={0.75}
										flexWrap="wrap"
									>
										{DAY_ORDER.map((day) => {
											const selected =
												draftTradeDays.includes(day);
											return (
												<Chip
													key={day}
													label={DAY_LABELS[
														day
													].slice(0, 3)}
													clickable
													size="small"
													color={
														selected
															? 'primary'
															: 'default'
													}
													variant={
														selected
															? 'filled'
															: 'outlined'
													}
													onClick={() =>
														setDraftTradeDays(
															(days) =>
																selected
																	? days.filter(
																			(
																				d,
																			) =>
																				d !==
																				day,
																		)
																	: [
																			...days,
																			day,
																		],
														)
													}
												/>
											);
										})}
									</Stack>
								</Stack>

								<Stack gap={0.5}>
									<Typography
										variant="body2"
										color="text.secondary"
									>
										Tokens
									</Typography>
									{[
										{
											token: '[game]',
											desc: 'the game(s) in this meetup',
										},
										{
											token: '[amount]',
											desc: 'total price',
										},
										{
											token: '[day]',
											desc: 'your preferred day(s) above, e.g. "Thursday or Friday"',
										},
										{
											token: '[location]',
											desc: "the meetup's location",
										},
										{
											token: '[name]',
											desc: 'your own name',
										},
									].map(({ token, desc }) => (
										<Stack
											key={token}
											direction="row"
											gap={1}
											alignItems="baseline"
										>
											<Typography
												component="code"
												variant="body2"
												sx={{
													fontFamily: 'monospace',
													bgcolor: 'action.hover',
													px: 0.75,
													borderRadius: 1,
													flexShrink: 0,
													minWidth: 76,
												}}
											>
												{token}
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
											>
												{desc}
											</Typography>
										</Stack>
									))}
								</Stack>

								<Stack gap={0.5}>
									<Typography variant="body2">
										Template for sellers
										<Typography
											component="span"
											variant="body2"
											color="text.secondary"
										>
											{' '}
											- sent to people buying from you.
											Also has{' '}
											<Typography
												component="code"
												variant="body2"
												sx={{ fontFamily: 'monospace' }}
											>
												[buyer]
											</Typography>
											.
										</Typography>
									</Typography>
									<TextField
										multiline
										minRows={6}
										fullWidth
										size="small"
										value={draftSellerTemplate}
										onChange={(evt) =>
											setDraftSellerTemplate(
												evt.target.value,
											)
										}
									/>
								</Stack>

								<Stack gap={0.5}>
									<Typography variant="body2">
										Template for buyers
										<Typography
											component="span"
											variant="body2"
											color="text.secondary"
										>
											{' '}
											- sent to people you're buying from.
											Also has{' '}
											<Typography
												component="code"
												variant="body2"
												sx={{ fontFamily: 'monospace' }}
											>
												[seller]
											</Typography>
											.
										</Typography>
									</Typography>
									<TextField
										multiline
										minRows={5}
										fullWidth
										size="small"
										value={draftBuyerTemplate}
										onChange={(evt) =>
											setDraftBuyerTemplate(
												evt.target.value,
											)
										}
									/>
								</Stack>

								<Button
									type="button"
									variant="contained"
									size="small"
									disabled={geekmailSaving}
									onClick={saveGeekmailSettings}
									sx={{ alignSelf: 'start' }}
								>
									Save
								</Button>
							</>
						)}
					</Stack>
				</>
			)}

			{tab === 'notifications' && pushSupported && (
				<Stack gap={1.5} sx={sectionSx}>
					<Typography variant="subtitle2" color="text.secondary">
						Notifications
					</Typography>
					<Stack gap={1} alignItems="start">
						<Typography variant="body2">
							Get notified about your auctions.
						</Typography>
						{needsHomeScreenInstall && (
							<Typography variant="body2" color="text.secondary">
								Add this app to your home screen first - iOS
								only allows notifications for installed apps.
							</Typography>
						)}
						{pushPermission === 'denied' ? (
							<Typography variant="body2" color="text.secondary">
								Notifications are blocked for this site in your
								browser settings.
							</Typography>
						) : pushSubscribed ? (
							<>
								<Typography
									variant="body2"
									color="text.secondary"
								>
									Notifications are enabled on this device.
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
												disabled={preferencesSaving}
												onChange={() =>
													togglePreference(
														'notifyOnOutbid',
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
												disabled={preferencesSaving}
												onChange={() =>
													togglePreference(
														'notifyOnNewBid',
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
												disabled={preferencesSaving}
												onChange={() =>
													togglePreference(
														'notifyOnAuctionWon',
													)
												}
											/>
										}
										label="Auctions I've won"
									/>
									<FormControlLabel
										control={
											<Checkbox
												checked={
													notificationPreferences.notifyOnWishlistItemListed
												}
												disabled={preferencesSaving}
												onChange={() =>
													togglePreference(
														'notifyOnWishlistItemListed',
													)
												}
											/>
										}
										label="New listing for a wishlisted game"
									/>
									<FormControlLabel
										control={
											<Checkbox
												checked={
													notificationPreferences.notifyOnMeetupReminder
												}
												disabled={preferencesSaving}
												onChange={() =>
													togglePreference(
														'notifyOnMeetupReminder',
													)
												}
											/>
										}
										label="Meetup reminder (30 min before trading starts)"
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
				</Stack>
			)}

			{tab === 'general' && (
				<Stack gap={1.5} sx={sectionSx}>
					<Typography variant="subtitle2" color="text.secondary">
						Miscellaneous
					</Typography>
					<FormControlLabel
						control={
							<Checkbox
								checked={rememberSorting}
								onChange={(evt) =>
									setRememberSorting(evt.target.checked)
								}
							/>
						}
						label="Remember sorting order"
					/>
				</Stack>
			)}

			<Snackbar
				open={!!toastMessage}
				autoHideDuration={4000}
				onClose={() => setToastMessage(null)}
				message={toastMessage}
			/>
		</Stack>
	);
};
