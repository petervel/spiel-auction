import css from './BidAmount.module.css';

type BidAmountProps = {
	amount?: number;
	extraText?: string;
};
export const BidAmount = ({ amount, extraText = '' }: BidAmountProps) => {
	return amount && amount > 0 ? (
		<div className={css.showTotal}>
			<div className={css.total}>
				Total: €{amount}
				{extraText ? ` ${extraText}` : null}
			</div>
		</div>
	) : null;
};
