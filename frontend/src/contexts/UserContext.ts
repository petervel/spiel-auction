import { createContext } from 'react';

interface User {
	name: string;
	email: string;
	picture: string;
}

export interface UserContextType {
	user: User | null;
	login: () => void;
	logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(
	undefined
);
