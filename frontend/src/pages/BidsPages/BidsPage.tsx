import { Stack, Typography } from '@mui/material';
import TabBar from '../../components/TabBar/TabBar';
import { Item } from '../../model/Item';
import { ItemsPage } from '../ItemsPage/ItemsPage';
import css from './BidsPages.module.css';

type BidsPageProps = {
	title: string;
	items: Item[];
	totalBids: number;
};
const BidsPage = ({ title, items, totalBids }: BidsPageProps) => {
	console.log({ title, items, totalBids });
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
				{totalBids && (
					<div className={css.showTotal}>
						<div className={css.total}>Total: €{totalBids}</div>
					</div>
				)}

				<ItemsPage items={items} />
			</div>
		</>
	);
};

export default BidsPage;
