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

type Step = 'compose' | 'confirm' | 'done';

// A push notification to every user who hasn't opted out (see
// User.notifyOnAdminBroadcast / POST /api/admin/broadcast) - irreversible
// once sent, so this always goes through its own confirm step first
// (compose -> confirm -> done), never a single "send" click. Mounted fresh
// each time it opens, same pattern as AddCustomMeetupDialog, so its draft
// always starts blank.
export const SendBroadcastDialog = ({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) => (
	<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
		{open && <DialogContentInner onClose={onClose} />}
	</Dialog>
);

const DialogContentInner = ({ onClose }: { onClose: () => void }) => {
	const [step, setStep] = useState<Step>('compose');
	const [title, setTitle] = useState('');
	const [body, setBody] = useState('');
	const [url, setUrl] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sentCount, setSentCount] = useState(0);

	const canReview = title.trim().length > 0 && body.trim().length > 0;

	const send = async () => {
		setSending(true);
		setError(null);
		try {
			const res = await fetch('/api/admin/broadcast', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					title: title.trim(),
					body: body.trim(),
					url: url.trim() || undefined,
				}),
			});
			const resBody = await res.json();
			if (!res.ok) throw new Error(resBody.error ?? 'Failed to send');
			setSentCount(resBody.sentToUsers);
			setStep('done');
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSending(false);
		}
	};

	if (step === 'done') {
		return (
			<>
				<DialogTitle>Sent</DialogTitle>
				<DialogContent>
					<Typography>
						Sent to {sentCount} user{sentCount === 1 ? '' : 's'}.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button variant="contained" onClick={onClose}>
						Close
					</Button>
				</DialogActions>
			</>
		);
	}

	if (step === 'confirm') {
		return (
			<>
				<DialogTitle>Send to everyone?</DialogTitle>
				<DialogContent>
					<Stack gap={1.5} paddingTop={0.5}>
						<Typography variant="body2" color="text.secondary">
							This sends a push notification right now to every
							user who hasn't opted out of admin announcements in
							Settings. This can't be undone.
						</Typography>
						<Stack
							gap={0.5}
							sx={{
								border: '1px solid',
								borderColor: 'divider',
								borderRadius: 1,
								padding: 1.5,
							}}
						>
							<Typography fontWeight={600}>{title}</Typography>
							<Typography variant="body2">{body}</Typography>
						</Stack>
						{error && (
							<Typography color="error">{error}</Typography>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setStep('compose')}
						disabled={sending}
					>
						Back
					</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={sending}
						onClick={send}
					>
						Send to everyone
					</Button>
				</DialogActions>
			</>
		);
	}

	return (
		<>
			<DialogTitle>Send notification to all users</DialogTitle>
			<DialogContent>
				<Stack gap={2} paddingTop={0.5}>
					<Typography variant="body2" color="text.secondary">
						Goes out as a push notification to everyone with
						notifications enabled who hasn't opted out of admin
						announcements in Settings.
					</Typography>
					<TextField
						label="Title"
						size="small"
						value={title}
						onChange={(evt) => setTitle(evt.target.value)}
					/>
					<TextField
						label="Message"
						size="small"
						multiline
						minRows={3}
						value={body}
						onChange={(evt) => setBody(evt.target.value)}
					/>
					<TextField
						label="Link (optional)"
						placeholder="/latest"
						size="small"
						value={url}
						onChange={(evt) => setUrl(evt.target.value)}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button
					variant="contained"
					disabled={!canReview}
					onClick={() => setStep('confirm')}
				>
					Review
				</Button>
			</DialogActions>
		</>
	);
};
