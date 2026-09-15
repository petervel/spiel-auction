import { Sort } from '@mui/icons-material';
import { ReactNode, useMemo, useState } from 'react';
import { ItemDisplayOptions } from '../../components/AuctionItem/ItemDisplayOptions';
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
	// Which of `items` are currently outbid - only meaningful together with
	// options.silentToggle, to pick the broken-heart icon for those items.
	outbidItemIds?: Set<number>;
	// Buying/Selling want ended auctions pushed to the bottom regardless of
	// the chosen sort - see sortItems. Not part of `options`: it's a sort
	// concern consumed entirely here, and never reaches ItemsList/AuctionItem.
	endedLast?: boolean;
	options?: ItemDisplayOptions;
};

export const ItemsPage = ({
	title,
	items,
	subTitle,
	outbidItemIds,
	endedLast = false,
	options,
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
				outbidItemIds={outbidItemIds}
				options={options}
			/>
		</Container>
	);
};
