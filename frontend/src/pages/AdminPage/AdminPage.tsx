import { Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { AdminStats, useAdminStats } from '../../hooks/useAdminStats';
import { useUser } from '../../hooks/useUser';

// Matches SettingsPage's sectionSx - a bordered card per group, consistent
// with how the rest of the app sets settings/info sections apart.
const sectionSx = {
	border: '1px solid',
	borderColor: 'divider',
	borderRadius: 2,
	padding: 2,
} as const;

const StatTile = ({ label, value }: { label: string; value: string }) => (
	<Stack sx={{ minWidth: 120 }}>
		<Typography variant="h6">{value}</Typography>
		<Typography variant="body2" color="text.secondary">
			{label}
		</Typography>
	</Stack>
);

const RESULT_COLOR: Record<
	NonNullable<AdminStats['lastResult']>,
	'success' | 'error' | 'info' | 'default'
> = {
	SUCCESS: 'success',
	FAILURE: 'error',
	RUNNING: 'info',
	NONE: 'default',
};

const FairStats = () => {
	const { stats, loading, error, refresh } = useAdminStats();

	return (
		<Stack gap={1.5} sx={sectionSx}>
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
			>
				<Typography variant="subtitle2" color="text.secondary">
					{stats?.fairName
						? `Fair activity - ${stats.fairName}`
						: 'Fair activity'}
				</Typography>
				<Button
					size="small"
					onClick={() => refresh()}
					disabled={loading}
				>
					Refresh
				</Button>
			</Stack>

			{loading && !stats ? (
				<Spinner />
			) : error ? (
				<Typography color="error">{error}</Typography>
			) : stats ? (
				<>
					<Stack direction="row" alignItems="center" gap={1}>
						<Typography variant="body2" color="text.secondary">
							Last import:
						</Typography>
						{stats.lastResult && (
							<Chip
								size="small"
								label={stats.lastResult}
								color={RESULT_COLOR[stats.lastResult]}
							/>
						)}
						<Typography variant="body2" color="text.secondary">
							{stats.lastUpdated
								? new Date(
										stats.lastUpdated * 1000,
									).toLocaleString()
								: 'never'}
						</Typography>
					</Stack>

					<Typography variant="body2" color="text.secondary">
						People
					</Typography>
					<Stack direction="row" gap={2} flexWrap="wrap">
						<StatTile
							label="Active on this fair"
							value={String(stats.activeUsers)}
						/>
						<StatTile
							label="Set a BGG username"
							value={String(stats.usersWithBggUsername)}
						/>
						<StatTile
							label="Verified BGG username"
							value={String(stats.usersWithConfirmedBgg)}
						/>
						<StatTile
							label="Set a meetup spot"
							value={String(stats.usersWithLocationSquare)}
						/>
					</Stack>

					<Typography variant="body2" color="text.secondary">
						Auctions
					</Typography>
					<Stack direction="row" gap={2} flexWrap="wrap">
						<StatTile
							label="Items listed"
							value={String(stats.totalItems)}
						/>
						<StatTile
							label="Items with bids"
							value={String(stats.itemsWithBids)}
						/>
						<StatTile
							label="Ended"
							value={String(stats.endedAuctions)}
						/>
						<StatTile
							label="People selling"
							value={String(stats.distinctSellers)}
						/>
						<StatTile
							label="People bidding"
							value={String(stats.distinctBidders)}
						/>
						<StatTile
							label="Total bid value"
							value={`€${stats.totalBidValue}`}
						/>
					</Stack>

					<Typography variant="body2" color="text.secondary">
						Meetups &amp; likes
					</Typography>
					<Stack direction="row" gap={2} flexWrap="wrap">
						<StatTile
							label="Meetups started"
							value={String(stats.meetupCount)}
						/>
						<StatTile
							label="Meetups completed"
							value={String(stats.meetupCompletedCount)}
						/>
						<StatTile
							label="Liked items"
							value={String(stats.likeCount)}
						/>
					</Stack>
				</>
			) : null}
		</Stack>
	);
};

type AdminUserResult = {
	id: number;
	bggUsername: string | null;
	accessLevel: string;
	verified: boolean;
	createdAt: string;
};

export const AdminPage = () => {
	const { realAdmin, isLoading, startEmulating } = useUser();
	const navigate = useNavigate();

	const [query, setQuery] = useState('');
	const [results, setResults] = useState<AdminUserResult[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (isLoading) return <Spinner />;

	if (!realAdmin) {
		return (
			<Stack
				paddingInline="2rem"
				paddingBottom="2rem"
				sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
			>
				<Title title="Admin" left={<BackButton />} />
				<Typography>Admins only.</Typography>
			</Stack>
		);
	}

	const search = async (evt: FormEvent) => {
		evt.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const res = await fetch(
				`/api/admin/users/search?bggUsername=${encodeURIComponent(query)}`,
				{ credentials: 'include' },
			);
			const body = await res.json();
			if (!res.ok) {
				setError(body.error ?? 'Search failed');
				setResults(null);
			} else {
				setResults(body.users);
			}
		} catch {
			setError('Search failed');
		} finally {
			setBusy(false);
		}
	};

	const emulate = async (userId: number) => {
		setError(null);
		setBusy(true);
		const err = await startEmulating(userId);
		setBusy(false);
		if (err) {
			setError(err);
		} else {
			navigate('/');
		}
	};

	return (
		<Stack
			paddingInline="2rem"
			paddingBottom="2rem"
			gap={2}
			sx={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}
		>
			<Title title="Admin" left={<BackButton />} />

			<Button
				component={Link}
				to="/admin/fairs"
				variant="outlined"
				sx={{ alignSelf: 'start' }}
			>
				Manage fairs
			</Button>

			<FairStats />

			<Typography variant="h6">Emulate user</Typography>
			<Stack component="form" onSubmit={search} direction="row" gap={1}>
				<TextField
					size="small"
					label="BGG username"
					value={query}
					onChange={(evt) => setQuery(evt.target.value)}
					fullWidth
				/>
				<Button type="submit" variant="contained" disabled={busy}>
					Search
				</Button>
			</Stack>

			{error && <Typography color="error">{error}</Typography>}

			{results && results.length === 0 && (
				<Typography color="text.secondary">No users found.</Typography>
			)}

			{results?.map((result) => (
				<Stack
					key={result.id}
					direction="row"
					alignItems="center"
					justifyContent="space-between"
					gap={1}
				>
					<Stack direction="row" alignItems="center" gap={1}>
						<Typography>
							{result.bggUsername ??
								`(no BGG username, #${result.id})`}
						</Typography>
						{result.verified ? (
							<Chip
								size="small"
								label="verified"
								color="success"
							/>
						) : (
							<Chip size="small" label="not verified" />
						)}
						{result.accessLevel !== 'NORMAL' && (
							<Chip size="small" label={result.accessLevel} />
						)}
					</Stack>
					<Button
						size="small"
						variant="outlined"
						disabled={busy}
						onClick={() => emulate(result.id)}
					>
						Emulate
					</Button>
				</Stack>
			))}
		</Stack>
	);
};
