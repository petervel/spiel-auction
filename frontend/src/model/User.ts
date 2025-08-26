export interface User {
	id: number;
	email: string;
	createdAt: string;
	currentUserFair: UserFair | null;

	accessLevel?: 'USER' | 'ADMIN' | 'MODERATOR';
	bggUsername?: string;
}

export interface UserFair {
	id: number;
	userId: number;
	fairId: number;
	bookmark: number | null;
}
