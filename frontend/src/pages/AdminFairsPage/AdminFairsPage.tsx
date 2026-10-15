import {
	Button,
	Checkbox,
	Chip,
	FormControlLabel,
	MenuItem,
	Snackbar,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { BackButton } from '../../components/BackButton/BackButton';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { FairInput, useAdminFairs } from '../../hooks/useAdminFairs';
import { useUser } from '../../hooks/useUser';
import { Fair } from '../../model/Fair';

// Matches SettingsPage/AdminPage's sectionSx - a bordered card per fair,
// consistent with how the rest of the app sets things apart.
const sectionSx = {
	border: '1px solid',
	borderColor: 'divider',
	borderRadius: 2,
	padding: 2,
} as const;

const RESULT_COLOR: Record<
	Fair['lastResult'],
	'success' | 'error' | 'info' | 'default'
> = {
	SUCCESS: 'success',
	FAILURE: 'error',
	RUNNING: 'info',
	NONE: 'default',
};

const toDateInputValue = (iso: string) => iso.slice(0, 10);

// Form state keeps geeklistId as a string (so the field can be
// legitimately empty while typing) - only converted to FairInput's number
// right before actually submitting.
type FairDraft = {
	name: string;
	geeklistId: string;
	eventDate: string;
	status: Fair['status'];
	hidden: boolean;
};

const emptyDraft: FairDraft = {
	name: '',
	geeklistId: '',
	eventDate: '',
	status: 'ACTIVE',
	hidden: false,
};

const draftFor = (fair: Fair): FairDraft => ({
	name: fair.name,
	geeklistId: String(fair.geeklistId),
	eventDate: toDateInputValue(fair.eventDate),
	status: fair.status,
	hidden: fair.hidden,
});

const toFairInput = (draft: FairDraft): FairInput => ({
	...draft,
	geeklistId: Number(draft.geeklistId),
});

const FairFields = ({
	draft,
	setDraft,
}: {
	draft: FairDraft;
	setDraft: (draft: FairDraft) => void;
}) => (
	<Stack gap={2}>
		<Stack direction="row" gap={2} flexWrap="wrap">
			<TextField
				label="Name"
				size="small"
				value={draft.name}
				onChange={(evt) =>
					setDraft({ ...draft, name: evt.target.value })
				}
				sx={{ flex: '1 1 200px' }}
			/>
			<TextField
				label="BGG geeklist ID"
				size="small"
				type="number"
				value={draft.geeklistId}
				onChange={(evt) =>
					setDraft({ ...draft, geeklistId: evt.target.value })
				}
				sx={{ flex: '1 1 160px' }}
			/>
		</Stack>
		<Stack direction="row" gap={2} flexWrap="wrap">
			<TextField
				label="Event date (official opening day, a Thursday)"
				size="small"
				type="date"
				value={draft.eventDate}
				onChange={(evt) =>
					setDraft({ ...draft, eventDate: evt.target.value })
				}
				InputLabelProps={{ shrink: true }}
				helperText="Also used for meetup reminders"
				sx={{ flex: '1 1 160px' }}
			/>
			<TextField
				select
				label="Status"
				size="small"
				value={draft.status}
				onChange={(evt) =>
					setDraft({
						...draft,
						status: evt.target.value as Fair['status'],
					})
				}
				sx={{ flex: '1 1 160px' }}
			>
				<MenuItem value="ACTIVE">ACTIVE</MenuItem>
				<MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
			</TextField>
		</Stack>
		<FormControlLabel
			control={
				<Checkbox
					checked={draft.hidden}
					onChange={(evt) =>
						setDraft({ ...draft, hidden: evt.target.checked })
					}
				/>
			}
			label="Hidden (not selectable by normal users)"
		/>
	</Stack>
);

// Collapsed by default - shown behind its own "Add New Fair" button rather
// than always taking up space at the top of the list.
const NewFairForm = () => {
	const { createFair, creating, createError } = useAdminFairs();
	const [draft, setDraft] = useState<FairDraft>(emptyDraft);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	const submit = async (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		try {
			const fair = await createFair(toFairInput(draft));
			setDraft(emptyDraft);
			setOpen(false);
			setToastMessage(`Created "${fair.name}"`);
		} catch {
			// createError (from the mutation) already renders the message.
		}
	};

	if (!open) {
		return (
			<Button
				variant="outlined"
				onClick={() => setOpen(true)}
				sx={{ alignSelf: 'center' }}
			>
				Add New Fair
			</Button>
		);
	}

	return (
		<Stack gap={1.5} sx={sectionSx} component="form" onSubmit={submit}>
			<Typography variant="subtitle2" color="text.secondary">
				Add a fair
			</Typography>
			<FairFields draft={draft} setDraft={setDraft} />
			{createError && <Typography color="error">{createError}</Typography>}
			<Stack direction="row" gap={1}>
				<Button type="submit" variant="contained" disabled={creating}>
					Create
				</Button>
				<Button
					type="button"
					onClick={() => setOpen(false)}
					disabled={creating}
				>
					Cancel
				</Button>
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

const FairEditForm = ({
	fair,
	onCancel,
}: {
	fair: Fair;
	onCancel: () => void;
}) => {
	const { updateFair, updating } = useAdminFairs();
	const [draft, setDraft] = useState<FairDraft>(() => draftFor(fair));
	const [error, setError] = useState<string | null>(null);

	const submit = async (evt: FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		setError(null);
		try {
			await updateFair({ id: fair.id, ...toFairInput(draft) });
			onCancel();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save');
		}
	};

	return (
		<Stack gap={1.5} component="form" onSubmit={submit}>
			<FairFields draft={draft} setDraft={setDraft} />
			{error && <Typography color="error">{error}</Typography>}
			<Stack direction="row" gap={1}>
				<Button type="submit" variant="contained" disabled={updating}>
					Save
				</Button>
				<Button type="button" onClick={onCancel} disabled={updating}>
					Cancel
				</Button>
			</Stack>
		</Stack>
	);
};

const FairRow = ({ fair }: { fair: Fair }) => {
	const [isEditing, setIsEditing] = useState(false);

	if (isEditing) {
		return (
			<Stack gap={1.5} sx={sectionSx}>
				<FairEditForm fair={fair} onCancel={() => setIsEditing(false)} />
			</Stack>
		);
	}

	return (
		<Stack gap={1} sx={sectionSx}>
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
				gap={1}
				flexWrap="wrap"
			>
				<Stack direction="row" alignItems="center" gap={1}>
					<Typography variant="subtitle1" fontWeight={700}>
						{fair.name}
					</Typography>
					<Chip
						size="small"
						label={fair.status}
						color={fair.status === 'ACTIVE' ? 'success' : 'default'}
					/>
					{fair.hidden && <Chip size="small" label="hidden" />}
				</Stack>
				<Button size="small" onClick={() => setIsEditing(true)}>
					Edit
				</Button>
			</Stack>
			<Typography variant="body2" color="text.secondary">
				Geeklist #{fair.geeklistId} · Event date{' '}
				{new Date(fair.eventDate).toLocaleDateString()}
			</Typography>
			<Stack direction="row" alignItems="center" gap={1}>
				<Typography variant="body2" color="text.secondary">
					Last import:
				</Typography>
				<Chip
					size="small"
					label={fair.lastResult}
					color={RESULT_COLOR[fair.lastResult]}
				/>
				<Typography variant="body2" color="text.secondary">
					{fair.lastUpdated
						? new Date(fair.lastUpdated * 1000).toLocaleString()
						: 'never'}
				</Typography>
			</Stack>
		</Stack>
	);
};

export const AdminFairsPage = () => {
	const { realAdmin, isLoading } = useUser();
	const { fairs, loading, error } = useAdminFairs();

	if (isLoading) return <Spinner />;

	if (!realAdmin) {
		return (
			<Stack
				paddingInline="2rem"
				paddingBottom="2rem"
				sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
			>
				<Title title="Manage Fairs" left={<BackButton to="/admin" />} />
				<Typography>Admins only.</Typography>
			</Stack>
		);
	}

	return (
		<Stack
			paddingInline="2rem"
			paddingBottom="2rem"
			gap={2}
			sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
		>
			<Title title="Manage Fairs" left={<BackButton to="/admin" />} />

			{loading ? (
				<Spinner />
			) : error ? (
				<Typography color="error">{error}</Typography>
			) : (
				fairs.map((fair) => <FairRow key={fair.id} fair={fair} />)
			)}

			<NewFairForm />
		</Stack>
	);
};
