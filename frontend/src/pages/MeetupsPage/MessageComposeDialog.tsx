import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { useState } from 'react';
import { useGeekmailSettings } from '../../hooks/useGeekmailSettings';
import { useUser } from '../../hooks/useUser';
import { MeetupEntry } from '../../hooks/useMeetups';
import {
	buildGeekmailMessage,
	buildGeekmailUrl,
	SUBJECT_MAX_LENGTH,
} from './geekmailMessage';

// Builds the subject/body from the user's own template, but never sends
// anything itself - "Open in BGG" just hands off to BGG's own compose
// form, pre-filled, so the user can still edit or back out there too.
export const MessageComposeDialog = ({
	entry,
	open,
	onClose,
}: {
	entry: MeetupEntry;
	open: boolean;
	onClose: () => void;
}) => (
	<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
		{/* Mounted fresh each time the dialog opens, so its draft state's
		initializer re-derives from the current template/entry without
		needing an effect to re-sync it. */}
		{open && <ComposeDialogContent entry={entry} onClose={onClose} />}
	</Dialog>
);

const ComposeDialogContent = ({
	entry,
	onClose,
}: {
	entry: MeetupEntry;
	onClose: () => void;
}) => {
	const { user } = useUser();
	const { settings } = useGeekmailSettings();

	const initial = buildGeekmailMessage(
		entry,
		settings,
		user?.bggUsername ?? '',
		user?.currentUserFair?.locationSquare
	);
	const [subject, setSubject] = useState(initial.subject);
	const [body, setBody] = useState(initial.body);

	const openInBgg = () => {
		window.open(
			buildGeekmailUrl({ to: entry.counterpart, subject, body }),
			'_blank',
			'noopener,noreferrer'
		);
		onClose();
	};

	return (
		<>
			<DialogTitle>Message {entry.counterpart}</DialogTitle>
			<DialogContent>
				<Stack gap={2} paddingTop={0.5}>
					<Typography variant="body2" color="text.secondary">
						Sent via BGG geekmail. Edit freely before sending -
						this only opens BGG's own compose form, pre-filled;
						nothing is sent from here.
					</Typography>
					<TextField
						label="Subject"
						size="small"
						fullWidth
						value={subject}
						onChange={(evt) => setSubject(evt.target.value)}
						helperText={`${subject.length}/${SUBJECT_MAX_LENGTH}`}
					/>
					<TextField
						label="Message"
						size="small"
						fullWidth
						multiline
						minRows={6}
						value={body}
						onChange={(evt) => setBody(evt.target.value)}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={openInBgg}>
					Open in BGG
				</Button>
			</DialogActions>
		</>
	);
};
