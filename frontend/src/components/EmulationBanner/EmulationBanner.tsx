import { Alert, Button } from '@mui/material';
import { useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { useUser } from '../../hooks/useUser';

// Lives inside the QueryClientProvider so it can drop cached data whenever
// the effective user changes - otherwise the previous user's lists would
// linger until their own refetch interval.
export const EmulationBanner = () => {
	const { user, emulating, stopEmulating } = useUser();
	const queryClient = useQueryClient();
	const userId = user?.id;

	useEffect(() => {
		queryClient.clear();
	}, [userId, queryClient]);

	if (!emulating || !user) return null;

	return (
		<Alert
			severity="warning"
			sx={{ borderRadius: '10px', mb: 2 }}
			action={
				<Button color="inherit" size="small" onClick={stopEmulating}>
					Stop
				</Button>
			}
		>
			Viewing as {user.bggUsername ?? `user ${user.id}`}
		</Alert>
	);
};
