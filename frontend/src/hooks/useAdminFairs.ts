import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Fair } from '../model/Fair';

export type FairInput = {
	name: string;
	geeklistId: number;
	eventDate: string;
	status: Fair['status'];
	hidden: boolean;
};

const fetchFairs = async (): Promise<Fair[]> => {
	const res = await fetch('/api/admin/fairs', { credentials: 'include' });
	const body = await res.json();
	if (!res.ok) throw new Error(body.error ?? 'Failed to load fairs');
	return body.fairs;
};

const createFair = async (input: FairInput): Promise<Fair> => {
	const res = await fetch('/api/admin/fairs', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	const body = await res.json();
	if (!res.ok) throw new Error(body.error ?? 'Failed to create fair');
	return body.fair;
};

const updateFair = async ({
	id,
	...input
}: Partial<FairInput> & { id: number }): Promise<Fair> => {
	const res = await fetch(`/api/admin/fairs/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	const body = await res.json();
	if (!res.ok) throw new Error(body.error ?? 'Failed to update fair');
	return body.fair;
};

export const useAdminFairs = () => {
	const queryClient = useQueryClient();
	const query = useQuery<Fair[], Error>(['adminFairs'], fetchFairs);

	const invalidate = () => queryClient.invalidateQueries(['adminFairs']);

	const createMutation = useMutation<Fair, Error, FairInput>(createFair, {
		onSuccess: invalidate,
	});
	const updateMutation = useMutation<
		Fair,
		Error,
		Partial<FairInput> & { id: number }
	>(updateFair, { onSuccess: invalidate });

	return {
		fairs: query.data ?? [],
		loading: query.isLoading,
		error: query.error?.message ?? null,
		createFair: createMutation.mutateAsync,
		creating: createMutation.isLoading,
		createError: createMutation.error?.message ?? null,
		updateFair: updateMutation.mutateAsync,
		updating: updateMutation.isLoading,
	};
};
