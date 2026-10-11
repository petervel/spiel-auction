import { Fair } from './Fair';

export interface User {
	id: number;
	email: string;
	createdAt: string;
	currentUserFair: UserFair | null;

	accessLevel?: 'NORMAL' | 'ADMIN' | 'MODERATOR';
	bggUsername?: string;
	bggVerified?: boolean;

	notifyOnOutbid?: boolean;
	notifyOnNewBid?: boolean;
	notifyOnAuctionWon?: boolean;
	notifyOnWishlistItemListed?: boolean;

	preferredTradeDays?: (
		| 'WEDNESDAY'
		| 'THURSDAY'
		| 'FRIDAY'
		| 'SATURDAY'
		| 'SUNDAY'
	)[];
	sellerMessageTemplate?: string | null;
	buyerMessageTemplate?: string | null;
}

export interface UserFair {
	id: number;
	userId: number;
	fairId: number;
	bookmark: number | null;
	locationSquare: string | null;
	locationDescription: string | null;
	fair: Fair;
}
