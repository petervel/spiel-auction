import { Fair } from './Fair';

export interface User {
	id: number;
	email: string;
	createdAt: string;
	currentUserFair: UserFair | null;

	accessLevel?: 'NORMAL' | 'ADMIN' | 'MODERATOR';
	bggUsername?: string;

	notifyOnOutbid?: boolean;
	notifyOnNewBid?: boolean;
	notifyOnAuctionWon?: boolean;
}

export interface UserFair {
	id: number;
	userId: number;
	fairId: number;
	bookmark: number | null;
	fair: Fair;
}
