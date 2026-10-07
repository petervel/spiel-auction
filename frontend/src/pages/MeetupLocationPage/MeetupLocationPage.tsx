import {
	Button,
	Divider,
	Snackbar,
	Stack,
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
import { useLocationCounts } from '../../hooks/useLocationCounts';
import { useMeetupLocation } from '../../hooks/useMeetupLocation';
import { useUser } from '../../hooks/useUser';
import { TradeFloorGrid } from './TradeFloorGrid';

const TITLE = "Meetup Info";

export const MeetupLocationPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const { square, description, setLocation, saving } = useMeetupLocation();
	const { bggUsername, verification, fetchVerification } = useBggUsername();
	const {
		data: counts,
		isLoading: countsLoading,
		refresh: refreshCounts,
	} = useLocationCounts();

	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const [editDescription, setEditDescription] = useState(description ?? '');
	useEffect(() => {
		if (!saving) {
			setEditDescription(description ?? '');
		}
	}, [description, saving]);

	useEffect(() => {
		if (bggUsername) fetchVerification();
	}, [bggUsername, fetchVerification]);

	// Sends whatever's currently typed (even if not explicitly saved yet) so
	// clicking a square never discards an in-progress description edit.
	// Clicking the already-selected square again deselects it (sends null)
	// rather than re-setting the same square.
	const handleSelectSquare = async (newSquare: string) => {
		const deselecting = newSquare === square;
		const { success, error } = await setLocation(
			deselecting ? null : newSquare,
			editDescription || null,
		);
		if (success) {
			refreshCounts();
			setToastMessage(
				deselecting
					? 'Location cleared'
					: `Location set to ${newSquare}`,
			);
		} else {
			setToastMessage(error ?? 'Failed to update location');
		}
	};

	const saveDescription = async (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		// square may be null here - the description works on its own, so
		// this just keeps whatever square (or lack of one) is already set.
		const { success, error } = await setLocation(
			square,
			editDescription || null,
		);
		setToastMessage(
			success
				? 'Description saved'
				: (error ?? 'Failed to save description'),
		);
	};

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Stack paddingInline="2rem" paddingBottom="2rem">
				<Title
					title={TITLE}
					left={<BackButton to="/settings" />}
				/>
				<p>
					<LoginLink /> to set your meetup location.
				</p>
			</Stack>
		);
	}

	if (!bggUsername) {
		return (
			<Stack paddingInline="2rem" paddingBottom="2rem">
				<Title
					title={TITLE}
					left={<BackButton to="/settings" />}
				/>
				<Typography>
					Set your BGG username in{' '}
					<Link to="/settings">Settings</Link> before setting a meetup
					location.
				</Typography>
			</Stack>
		);
	}

	if (!verification) return <Spinner />;

	if (!verification.confirmed) {
		return (
			<Stack paddingInline="2rem" paddingBottom="2rem">
				<Title
					title={TITLE}
					left={<BackButton to="/settings" />}
				/>
				<Typography>
					Verify your BGG username in{' '}
					<Link to="/settings">Settings</Link> before setting a meetup
					location - this proves the person meeting up is actually
					you.
				</Typography>
			</Stack>
		);
	}

	return (
		<Stack
			paddingInline="2rem"
			paddingBottom="2rem"
			gap={3}
			sx={{ width: '100%', maxWidth: 540, marginInline: 'auto' }}
		>
			<Title
				title={TITLE}
				left={<BackButton to="/settings" />}
			/>
			<Stack gap={3}>
				<MeetupSpotSummary square={square} description={description} />
				<Typography variant="h6">How to find you</Typography>
				<form onSubmit={saveDescription} style={{ width: '100%' }}>
					<Stack gap={2} alignItems="start">
						<TextField
							value={editDescription}
							onChange={(evt) =>
								setEditDescription(evt.target.value)
							}
							fullWidth
							multiline
							minRows={3}
							label="How to find/recognize you"
							placeholder="e.g. red jacket, or call me on +32..."
							variant="standard"
						/>
						<Button
							variant="contained"
							type="submit"
							disabled={saving}
						>
							Save description
						</Button>
					</Stack>
				</form>
				<Divider />
				<Typography variant="body2" color="text.secondary">
					Click a square to set where you'll be. The red glow (and
					number) shows how many people (including you) have picked
					each square - pick a quieter one if you'd like.
				</Typography>
				<Stack alignItems="center">
					{countsLoading ? (
						<Spinner />
					) : (
						<TradeFloorGrid
							counts={counts ?? {}}
							selected={square}
							onSelect={handleSelectSquare}
						/>
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
