import { Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { useUser } from '../../hooks/useUser';

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
			<Stack paddingInline="1rem" paddingBottom="2rem">
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
		<Stack paddingInline="1rem" paddingBottom="2rem" gap={2}>
			<Title title="Admin" left={<BackButton />} />

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
