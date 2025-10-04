import { ReactNode, useMemo, useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Title } from '../../components/Title/Title';
import { Item } from '../../model/Item';
import { SORTING, sortItems } from '../../util';
import { EditBggUserName } from './EditBggUserName';
import SortToggle from './SortToggle';
import { SortButtons } from './SortButtons';

type ItemsPageProps = {
	title: string;
	username?: string;
	items: Item[];
	subTitle?: ReactNode;
	setUsername: (_: string | undefined) => void;
	allowStars?: boolean;
};

export const ItemsPage = ({
	title,
	username,
	items,
	subTitle,
	setUsername,
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
					right={<SortToggle toggleSort={toggleSort} />}
				/>
				{subTitle}
				{username ? (
					<>
						{showSort && (
							<SortButtons
								sorting={sorting}
								setSorting={setSorting}
							/>
						)}

						<ItemsList
							items={sortedItems}
							allowStars={allowStars}
						/>
					</>
				) : (
					<EditBggUserName onSave={setUsername} />
				)}
			</Container>
		</>
	);
};
