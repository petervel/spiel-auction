import { Tooltip } from '@mui/material';
import classnames from 'classnames';
import { Item } from '../../model/Item';
import './AuctionPrice.css';

interface Props {
	item: Item;
}
const AuctionPrice = ({ item }: Props) => {
	const hasBids = item.hasBids;
	const binOnly = item.currentBid == item.binPrice;
	const classes = classnames('price', hasBids ? 'has-bids' : '');

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
		<Tooltip title={tooltip}>
			<div className={classes}>
				€{item.currentBid}
				{binOnly && '!'}
			</div>
		</Tooltip>
	);
};

export default AuctionPrice;
