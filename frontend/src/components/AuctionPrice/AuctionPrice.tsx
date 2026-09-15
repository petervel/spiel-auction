import classnames from 'classnames';
import { useUser } from '../../hooks/useUser';
import { Item } from '../../model/Item';
import css from './AuctionPrice.module.css';

interface Props {
	item: Item;
}
const AuctionPrice = ({ item }: Props) => {
	const { user } = useUser();
	const hasBids = item.hasBids;
	const binOnly = item.currentBid == item.binPrice;
	const isWinning =
		!!user?.bggUsername &&
		!!item.highestBidder &&
		item.highestBidder.toLowerCase() === user.bggUsername.toLowerCase();
	const classes = classnames(css.price, {
		[css.hasBids]: hasBids,
		[css.winning]: isWinning,
	});

	let tooltip = '';
	if (item.isSold) {
		tooltip = `SOLD for €${item.currentBid}`;
	} else if (binOnly) {
		tooltip = `Fixed price: €${item.binPrice}`;
	} else if (hasBids) {
		tooltip = `Current bid: €${item.currentBid}`;
	} else {
		tooltip = `Starting bid: €${item.currentBid}`;
	}

	return (
		// <Tooltip title={tooltip} enterDelay={1000} enterNextDelay={1000}>
		<div className={classes} title={tooltip}>
			€{item.currentBid}
			{binOnly && '!'}
		</div>
		// </Tooltip>
	);
};

export default AuctionPrice;
