import { Stack, Typography } from '@mui/material';
import AuctionItem from '../../components/AuctionItem/AuctionItem';
import TabBar from '../../components/TabBar/TabBar';
import { Item } from '../../model/Item';
import css from './ItemsPage.module.css';

type ItemsPageProps = {
	title: string;
	items: Item[];
	totalBids?: number;
};

export const ItemsPage = ({ title, items, totalBids }: ItemsPageProps) => {
	return (
		<>
			<TabBar />
			<div className={css.container}>
				<Stack direction="row" className={css.header}>
					<Typography
						variant="h5"
						component="h2"
						className={css.title}
					>
						{title}
					</Typography>
				</Stack>
				{totalBids && totalBids > 0 ? (
					<div className={css.showTotal}>
						<div className={css.total}>Total: €{totalBids}</div>
					</div>
				) : null}

				<ul className={css.items}>
					{items.length ? (
						items.map((item) => (
							<AuctionItem key={item.id} item={item} />
						))
					) : (
						<div className={css.noItems}>No items found.</div>
					)}
				</ul>
			</div>
		</>
	);
};
