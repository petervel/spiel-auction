import { InfoOutlined } from '@mui/icons-material';
import {
	Button,
	IconButton,
	MenuItem,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import { useState } from 'react';
import { MeetupChanges, MeetupDay, MeetupEntry } from '../../hooks/useMeetups';
import { DAY_OPTIONS, DEFAULT_TIME, HALL_1A } from './meetupDisplay';
import css from './MeetupsPage.module.css';

type LocationMode = 'HALL_1A' | 'OTHER';

// Mounted only while editing (the parent conditionally renders this
// component), so the lazy useState initializers below double as
// "populate from the current entry" - no separate "start editing" step
// needed. Drafted locally and only sent on Save (not per field) because
// this row can move to a different day/role group the moment "day"
// changes, which remounts it and would otherwise drop whatever's mid-edit.
export const MeetupRowEditForm = ({
	entry,
	onSave,
}: {
	entry: MeetupEntry;
	onSave: (changes: MeetupChanges) => void;
}) => {
	const [draftDay, setDraftDay] = useState<MeetupDay | ''>(
		() => entry.meetup.day ?? '',
	);
	// Time only has a meaningful value once a day is picked - until then,
	// ignore the schema's "15:00" default rather than show/edit it as if
	// someone had actually chosen that time.
	const [draftTime, setDraftTime] = useState(() =>
		entry.meetup.day ? entry.meetup.time : '',
	);
	const [draftLocation, setDraftLocation] = useState(
		() => entry.meetup.location,
	);
	const [draftNotes, setDraftNotes] = useState(
		() => entry.meetup.myNotes ?? '',
	);

	const changeDraftDay = (day: MeetupDay | '') => {
		setDraftDay(day);
		// Picking a day for the first time: default the still-empty time to
		// 15:00 rather than leave it blank.
		if (day && !draftTime) {
			setDraftTime(DEFAULT_TIME);
		}
	};

	// Derived, not separate state, so the dropdown and the actual saved
	// location string can never disagree: "Hall 1A" exactly means the
	// dropdown, anything else means a "Custom" description - which may
	// still physically be in Hall 1A (e.g. a manually typed-in coordinate,
	// for a counterpart who isn't on the app and has no square of their
	// own on file).
	const locationMode: LocationMode =
		draftLocation === HALL_1A ? 'HALL_1A' : 'OTHER';

	const changeLocationMode = (mode: LocationMode) => {
		setDraftLocation(mode === 'HALL_1A' ? HALL_1A : '');
	};

	const save = () => {
		onSave({
			day: (draftDay || null) as MeetupDay | null,
			time: draftTime,
			location: draftLocation,
			notes: draftNotes || null,
		});
	};

	const lastUpdatedLabel = entry.meetup.updatedAt
		? `Last updated ${new Date(entry.meetup.updatedAt).toLocaleString()}`
		: 'Not edited yet';

	return (
		<Stack gap="1rem" className={css.details}>
			<Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
				<TextField
					select
					label="Day"
					size="small"
					value={draftDay}
					onChange={(evt) =>
						changeDraftDay(evt.target.value as MeetupDay | '')
					}
					sx={{ flex: '1 1 150px', minWidth: 150 }}
				>
					{DAY_OPTIONS.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							{option.label}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Time"
					size="small"
					value={draftTime}
					onChange={(evt) => setDraftTime(evt.target.value)}
					sx={{ flex: '1 1 110px', minWidth: 110 }}
				/>
				<TextField
					select
					label="Location"
					size="small"
					value={locationMode}
					onChange={(evt) =>
						changeLocationMode(evt.target.value as LocationMode)
					}
					sx={{ flex: '1 1 150px', minWidth: 150 }}
				>
					<MenuItem value="HALL_1A">{HALL_1A}</MenuItem>
					<MenuItem value="OTHER">Custom</MenuItem>
				</TextField>
				{locationMode === 'OTHER' && (
					<TextField
						label="Where will you meet?"
						size="small"
						value={draftLocation}
						onChange={(evt) => setDraftLocation(evt.target.value)}
						sx={{ flex: '2 1 240px', minWidth: 240 }}
					/>
				)}
			</Stack>
			<TextField
				label="My notes"
				placeholder="Private - only you can see this"
				size="small"
				multiline
				minRows={2}
				value={draftNotes}
				onChange={(evt) => setDraftNotes(evt.target.value)}
				fullWidth
			/>
			<Stack
				direction="row"
				gap={2}
				alignItems="center"
				justifyContent="space-between"
				sx={{ mb: 1 }}
			>
				<Button size="small" variant="contained" onClick={save}>
					Save
				</Button>
				<Tooltip title={lastUpdatedLabel}>
					<IconButton size="small" aria-label={lastUpdatedLabel}>
						<InfoOutlined fontSize="small" />
					</IconButton>
				</Tooltip>
			</Stack>
			{locationMode === 'HALL_1A' &&
				(entry.counterpartLocation?.square ||
					entry.counterpartLocation?.description) && (
					<Stack gap={0.5}>
						{entry.counterpartLocation?.square && (
							<Typography variant="body2" color="text.secondary">
								Their spot: {entry.counterpartLocation.square}
							</Typography>
						)}
						{entry.counterpartLocation?.description && (
							<Typography variant="body2" color="text.secondary">
								Info: {entry.counterpartLocation.description}
							</Typography>
						)}
					</Stack>
				)}
		</Stack>
	);
};
