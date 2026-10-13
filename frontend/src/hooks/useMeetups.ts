import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Item } from '../model/Item';

export type MeetupDay =
	'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type MeetupRole = 'buying' | 'selling';

export type MeetupEntry = {
	role: MeetupRole;
	counterpart: string;
	counterpartLocation: {
		square: string | null;
		description: string | null;
	} | null;
	items: Item[];
	totalPrice: number;
	meetup: {
		day: MeetupDay | null;
		location: string;
		time: string;
		completed: boolean;
		completedAt: string | null;
		updatedAt: string | null;
		lastEditedBy: string | null;
		// Additive, never a replacement for the real item names/price - see
		// backend/src/api/meetups/index.ts.
		customDescription: string | null;
		// Always "mine" - the server resolves this from role, so the
		// other party's notes never reach the client at all.
		myNotes: string | null;
	};
};

export type MeetupUpdate = {
	counterpartUsername: string;
	role: MeetupRole;
	day?: MeetupDay | null;
	location?: string;
	time?: string;
	completed?: boolean;
	notes?: string | null;
	// Only valid when the meetup already has a customDescription - the
	// server rejects it otherwise (see POST /api/meetups).
	description?: string;
};

// What a row can change about its own meetup - counterpartUsername/role
// are derived server-side from the entry itself, never edited directly.
export type MeetupChanges = Omit<MeetupUpdate, 'counterpartUsername' | 'role'>;

export type CustomMeetupInput = {
	counterpartUsername: string;
	role: MeetupRole;
	description: string;
};

const fetchMeetups = async (): Promise<{ entries: MeetupEntry[] }> => {
	const response = await fetch('/api/meetups', { credentials: 'include' });
	if (!response.ok) {
		// Surfaces the server's own message (e.g. the "verify your BGG
		// username" gate) rather than a generic failure.
		const body = await response.json().catch(() => null);
		throw new Error(body?.error ?? 'Failed to fetch meetups');
	}
	return response.json();
};

const updateMeetup = async (update: MeetupUpdate) => {
	const response = await fetch('/api/meetups', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(update),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new Error(body?.error ?? 'Failed to update meetup');
	}
	return response.json();
};

const addCustomMeetup = async (input: CustomMeetupInput) => {
	const response = await fetch('/api/meetups/custom', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new Error(body?.error ?? 'Failed to add meetup');
	}
	return response.json();
};

export const useMeetups = () => {
	const queryClient = useQueryClient();

	const query = useQuery<{ entries: MeetupEntry[] }, Error>(
		['meetups'],
		fetchMeetups,
	);

	const mutation = useMutation(updateMeetup, {
		onSuccess: () => queryClient.invalidateQueries(['meetups']),
	});

	const customMutation = useMutation(addCustomMeetup, {
		onSuccess: () => queryClient.invalidateQueries(['meetups']),
	});

	return {
		entries: query.data?.entries ?? [],
		isLoading: query.isLoading,
		error: query.error,
		updateMeetup: mutation.mutate,
		isUpdating: mutation.isLoading,
		addCustomMeetup: customMutation.mutateAsync,
		isAddingCustomMeetup: customMutation.isLoading,
	};
};
