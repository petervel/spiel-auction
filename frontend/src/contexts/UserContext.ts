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
}

export const UserContext = createContext<UserContextType | undefined>(
	undefined
);
