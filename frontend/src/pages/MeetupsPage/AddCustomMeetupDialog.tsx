import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { useState } from 'react';
import { CustomMeetupInput, MeetupRole } from '../../hooks/useMeetups';

// A meetup with no (or not only) a real bid relationship behind it - see
// POST /api/meetups/custom. Mounted fresh each time it opens so its draft
// state always starts blank, same pattern as MessageComposeDialog.
export const AddCustomMeetupDialog = ({
	open,
	onClose,
	onAdd,
}: {
	open: boolean;
	onClose: () => void;
	onAdd: (input: CustomMeetupInput) => Promise<unknown>;
}) => (
	<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
		{open && <DialogContentInner onClose={onClose} onAdd={onAdd} />}
	</Dialog>
);

const DialogContentInner = ({
	onClose,
	onAdd,
}: {
	onClose: () => void;
	onAdd: (input: CustomMeetupInput) => Promise<unknown>;
}) => {
	const [role, setRole] = useState<MeetupRole>('selling');
	const [counterpartUsername, setCounterpartUsername] = useState('');
	const [description, setDescription] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSave =
		counterpartUsername.trim().length > 0 && description.trim().length > 0;

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			await onAdd({ counterpartUsername, role, description });
			onClose();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<DialogTitle>Add custom meetup</DialogTitle>
			<DialogContent>
				<Stack gap={2} paddingTop={0.5}>
					<Typography variant="body2" color="text.secondary">
						For meeting up with someone outside the auction itself,
						or adding something extra to an existing meetup.
					</Typography>
					<TextField
						select
						label="You are"
						size="small"
						value={role}
						onChange={(evt) => setRole(evt.target.value as MeetupRole)}
					>
						<MenuItem value="selling">Selling</MenuItem>
						<MenuItem value="buying">Buying</MenuItem>
					</TextField>
					<TextField
						label="Their BGG username"
						size="small"
						value={counterpartUsername}
						onChange={(evt) => setCounterpartUsername(evt.target.value)}
					/>
					<TextField
						label="Description"
						placeholder="What's this meetup for?"
						size="small"
						multiline
						minRows={2}
						value={description}
						onChange={(evt) => setDescription(evt.target.value)}
					/>
					{error && <Typography color="error">{error}</Typography>}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button
					variant="contained"
					disabled={!canSave || saving}
					onClick={save}
				>
					Add
				</Button>
			</DialogActions>
		</>
	);
};
