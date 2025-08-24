import { createContext } from 'react';
import { User } from '../model/user';

export interface UserContextType {
	user: User | null;
	login: () => void;
	logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(
	undefined
);
