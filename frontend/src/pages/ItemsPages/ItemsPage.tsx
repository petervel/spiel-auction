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
	items?: Item[];
	subTitle?: ReactNode;
	allowLikes?: boolean;
	silentToggle?: boolean;
	// Which of `items` are currently outbid - only meaningful together with
	// silentToggle, to pick the broken-heart icon for those specific items.
	outbidItemIds?: Set<number>;
	// Buying/Selling want ended auctions pushed to the bottom regardless of
	// the chosen sort - see sortItems.
	endedLast?: boolean;
};

export const ItemsPage = ({
	title,
	items,
	subTitle,
	allowLikes = false,
	silentToggle = false,
	outbidItemIds,
	endedLast = false,
}: ItemsPageProps) => {
	const [sorting, setSorting] = useState<SORTING>(SORTING.MOST_RECENT);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => setShowSort((v) => !v);

	const visibleItems = useMemo(
		() => sortItems(items ?? [], sorting, endedLast),
		[items, sorting, endedLast]
	);

	return (
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
			{showSort && (
				<SortButtons sorting={sorting} setSorting={setSorting} />
			)}
			<ItemsList
				items={visibleItems}
				allowLikes={allowLikes}
				silentToggle={silentToggle}
				outbidItemIds={outbidItemIds}
			/>
		</Container>
	);
};
