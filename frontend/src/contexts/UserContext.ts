import { createContext } from 'react';
import { User } from '../model/User';

export interface UserContextType {
	user: User | null;
	login: () => void;
	logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(
	undefined
);
