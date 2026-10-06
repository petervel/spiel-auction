import { createContext } from 'react';
import { User } from '../model/User';

export interface UserContextType {
	user: User | null;
	setUser: (user: User | null) => void;
	login: () => void;
	logout: () => void;
	isLoading: boolean;
	isLoginDialogOpen: boolean;
	openLoginDialog: () => void;
	closeLoginDialog: () => void;
	realAdmin: boolean;
	emulating: boolean;
	// Resolves to an error message, or null on success.
	startEmulating: (userId: number) => Promise<string | null>;
	stopEmulating: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(
	undefined,
);
