import { createContext } from 'react';

export const AuctionContext = createContext({
	auctionId: 0,
	setAuctionId: (value: number) => {
		console.log('setAuctionId: ', value);
	},
});
