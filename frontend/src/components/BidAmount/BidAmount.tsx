import css from './BidAmount.module.css';

type BidAmountProps = {
	amount?: number;
};
export const BidAmount = ({ amount }: BidAmountProps) => {
	return amount && amount > 0 ? (
		<div className={css.showTotal}>
			<div className={css.total}>Total: €{amount}</div>
		</div>
	) : null;
};
