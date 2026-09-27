import { Button, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useLocationCounts } from '../../hooks/useLocationCounts';
import { useMeetupLocation } from '../../hooks/useMeetupLocation';
import { useUser } from '../../hooks/useUser';
import { TradeFloorGrid } from './TradeFloorGrid';

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
	const handleSelectSquare = async (newSquare: string) => {
		const { success, error } = await setLocation(
			newSquare,
			editDescription || null,
		);
		if (success) {
			refreshCounts();
			setToastMessage(`Location set to ${newSquare}`);
		} else {
			setToastMessage(error ?? 'Failed to set location');
		}
	};

	const saveDescription = async (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		if (!square) return;
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
					title="Meetup Location"
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
					title="Meetup Location"
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
					title="Meetup Location"
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
		<Stack paddingInline="2rem" paddingBottom="2rem" gap={3} alignItems="center">
			<Title
				title="Meetup Location"
				left={<BackButton to="/settings" />}
			/>
			<Typography
				variant="body2"
				color="text.secondary"
				alignSelf="start"
			>
				Click a square to set where you'll be. The red glow shows how
				many people (including you) have picked each square - pick a
				quieter one if you'd like.
			</Typography>
			{countsLoading ? (
				<Spinner />
			) : (
				<TradeFloorGrid
					counts={counts ?? {}}
					selected={square}
					onSelect={handleSelectSquare}
				/>
			)}
			<form
				onSubmit={saveDescription}
				style={{ width: '100%', maxWidth: 400 }}
			>
				<Stack gap={2} alignItems="start">
					<TextField
						value={editDescription}
						onChange={(evt) => setEditDescription(evt.target.value)}
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
						disabled={saving || !square}
					>
						Save description
					</Button>
					{!square && (
						<Typography variant="body2" color="text.secondary">
							Pick a square above first.
						</Typography>
					)}
				</Stack>
			</form>
			<Snackbar
				open={!!toastMessage}
				autoHideDuration={4000}
				onClose={() => setToastMessage(null)}
				message={toastMessage}
			/>
		</Stack>
	);
};
