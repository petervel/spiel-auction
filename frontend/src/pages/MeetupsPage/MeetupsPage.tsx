import { ChevronRightRounded } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useListId } from '../../hooks/useListId';
import { MeetupChanges, MeetupEntry, useMeetups } from '../../hooks/useMeetups';
import { useUser } from '../../hooks/useUser';
import { AddCustomMeetupDialog } from './AddCustomMeetupDialog';
import { CompletedSection } from './CompletedSection';
import { groupByDay, sortByCompletedAtDesc } from './meetupDisplay';
import { RenameInput, RoleGroup } from './MeetupRow';
import css from './MeetupsPage.module.css';
import { exportMeetupsToXlsx } from './xlsxExport';

export const MeetupsPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const listId = useListId();
	const {
		entries,
		isLoading,
		error,
		updateMeetup,
		addCustomMeetup,
		renameCustomMeetup,
		deleteCustomMeetup,
	} = useMeetups();
	const [addingCustom, setAddingCustom] = useState(false);
	const { bggUsername, verification, fetchVerification } = useBggUsername();

	useEffect(() => {
		if (bggUsername) fetchVerification();
	}, [bggUsername, fetchVerification]);

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title="Meetups" left={<BackButton />} />
				<p>
					<LoginLink /> to see your meetups.
				</p>
			</Stack>
		);
	}

	// Same proof-of-ownership bar the backend enforces (requireVerifiedContext
	// in api/meetups/index.ts) - shown as its own states here instead of just
	// surfacing that route's 403 as plain error text.
	if (!bggUsername) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title="Meetups" left={<BackButton />} />
				<Typography>
					Set your BGG username in <Link to="/settings">Settings</Link>{' '}
					before using meetups.
				</Typography>
			</Stack>
		);
	}

	if (!verification) return <Spinner />;

	if (!verification.confirmed) {
		return (
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
			>
				<Title title="Meetups" left={<BackButton />} />
				<Typography>
					Verify your BGG username in <Link to="/settings">Settings</Link>{' '}
					before using meetups - this proves the person meeting up is
					actually you.
				</Typography>
			</Stack>
		);
	}

	const active = entries.filter((entry) => !entry.meetup.completed);
	const completed = sortByCompletedAtDesc(
		entries.filter((entry) => entry.meetup.completed),
	);
	const daySections = groupByDay(active);

	const onChangeFor = (entry: MeetupEntry) => (changes: MeetupChanges) =>
		updateMeetup({
			counterpartUsername: entry.counterpart,
			role: entry.role,
			...changes,
		});

	const onRenameFor = (entry: MeetupEntry) => (input: RenameInput) =>
		renameCustomMeetup({
			counterpartUsername: entry.counterpart,
			role: entry.role,
			...input,
		});

	const onDeleteFor = (entry: MeetupEntry) => () =>
		deleteCustomMeetup({
			counterpartUsername: entry.counterpart,
			role: entry.role,
		});

	return (
		<>
			<Stack
				sx={{ width: '100%', maxWidth: 640, marginX: 'auto' }}
				paddingInline="1rem"
				paddingBottom="2rem"
				gap={3}
			>
				<Title
					title="Meetups"
					left={<BackButton />}
					right={
						<Button
							variant="contained"
							size="small"
							disabled={entries.length === 0}
							onClick={() => exportMeetupsToXlsx(entries, listId)}
						>
							Export
						</Button>
					}
				/>

				{isLoading ? (
					<Spinner />
				) : error ? (
					<Typography color="error">{error.message}</Typography>
				) : (
					<>
						{entries.length === 0 ? (
							<Typography color="text.secondary">
								No meetups yet - these show up once you're
								winning (or have won) an item, or you've sold
								(or are selling) one with at least one bid.
							</Typography>
						) : (
							<>
								{daySections.map((section) => (
									<Stack key={section.key} gap={1.5}>
										{section.key === 'UNSCHEDULED' ? (
											<Typography variant="h6">
												{section.label}
											</Typography>
										) : (
											<Link
												to={`/meetups/${section.key.toLowerCase()}`}
												className={css.dayHeading}
											>
												<Typography variant="h6">
													{section.label}
												</Typography>
												<ChevronRightRounded fontSize="small" />
											</Link>
										)}
										{section.selling.length > 0 && (
											<RoleGroup
												label="Selling"
												entries={section.selling}
												onChangeFor={onChangeFor}
												onRenameFor={onRenameFor}
												onDeleteFor={onDeleteFor}
											/>
										)}
										{section.buying.length > 0 && (
											<RoleGroup
												label="Buying"
												entries={section.buying}
												onChangeFor={onChangeFor}
												onRenameFor={onRenameFor}
												onDeleteFor={onDeleteFor}
											/>
										)}
									</Stack>
								))}

								<CompletedSection
									entries={completed}
									onChangeFor={onChangeFor}
									onRenameFor={onRenameFor}
									onDeleteFor={onDeleteFor}
								/>
							</>
						)}

						<Button
							variant="contained"
							onClick={() => setAddingCustom(true)}
							sx={{ alignSelf: 'center' }}
						>
							Add custom meetup
						</Button>
					</>
				)}
			</Stack>
			<AddCustomMeetupDialog
				open={addingCustom}
				onClose={() => setAddingCustom(false)}
				onAdd={addCustomMeetup}
			/>
		</>
	);
};
