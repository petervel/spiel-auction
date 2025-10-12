import { Sort } from '@mui/icons-material';
import { ReactNode, useMemo, useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Title } from '../../components/Title/Title';
import { TitleButton } from '../../components/Title/TitleButton';
import { Item } from '../../model/Item';
import { SORTING, sortItems } from '../../util';
import { SortButtons } from './SortButtons';

type ItemsPageProps = {
	title: string;
	items: Item[];
	subTitle?: ReactNode;
	allowStars?: boolean;
};

export const ItemsPage = ({
	title,
	items,
	subTitle,
	allowStars = false,
}: ItemsPageProps) => {
	const [sorting, setSorting] = useState<SORTING>(SORTING.END_DATE);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => setShowSort((v) => !v);

	const sortedItems = useMemo(
		() => sortItems(items, sorting),
		[items, sorting]
	);

	return (
		<>
			<Container>
				<Title
					title={title}
					right={
						<TitleButton onClick={toggleSort}>
							<Sort />
						</TitleButton>
					}
				/>
				{subTitle}
				<>
					{showSort && (
						<SortButtons
							sorting={sorting}
							setSorting={setSorting}
						/>
					)}

					<ItemsList items={sortedItems} allowStars={allowStars} />
				</>
			</Container>
		</>
	);
};
