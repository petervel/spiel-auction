import { useUser } from './useUser';

// A logged-out visitor (or a user who hasn't been linked to a fair yet)
// falls back to the env-configured default; otherwise this reflects the
// user's actively selected fair, kept in sync via useUser's context state.
export const useListId = () => {
	const { user } = useUser();
	return (
		user?.currentUserFair?.fair?.geeklistId ??
		+import.meta.env.VITE_DEFAULT_GEEKLIST_ID!
	);
};
