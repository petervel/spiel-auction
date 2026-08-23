import { Sort } from '@mui/icons-material';
import { ReactNode, useMemo, useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Title } from '../../components/Title/Title';
import { TitleButton } from '../../components/Title/TitleButton';
import { Item } from '../../model/Item';
import { SORTING, sortItems } from '../../util';
import { SortButtons } from './SortButtons';

type ItemsSection = {
	label?: string;
	items: Item[];
};

type ItemsPageProps = {
	// Not used in sections mode - each section has its own title instead of
	// one shared page title.
	title: string;
	items?: Item[];
	// Renders each group as its own box with its own title and sort filter,
	// instead of one merged, sorted-together list under a shared page title
	// - use this instead of `items` when the groups need to stay visually
	// distinct (e.g. outbid vs. starred).
	sections?: ItemsSection[];
	subTitle?: ReactNode;
	allowStars?: boolean;
	outbidItemIds?: Set<number>;
};

export const ItemsPage = ({
	title,
	items,
	sections,
	subTitle,
	allowStars = false,
	outbidItemIds,
}: ItemsPageProps) => {
	const [sorting, setSorting] = useState<SORTING>(SORTING.MOST_RECENT);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => setShowSort((v) => !v);

	const visibleItems = useMemo(
		() => sortItems(items ?? [], sorting),
		[items, sorting]
	);

	// Sections render as separate boxes, each with its own title and sort
	// filter - one shared Container/Title would otherwise squash the groups
	// together under a single header.
	if (sections) {
		const nonEmptySections = sections.filter(
			(section) => section.items.length > 0
		);
		const visibleSections =
			nonEmptySections.length > 0 ? nonEmptySections : [sections[0]];

		return (
			<>
				{visibleSections.map((section, index) => (
					<ItemsSectionBlock
						key={section.label ?? index}
						label={section.label}
						items={section.items}
						allowStars={allowStars}
						outbidItemIds={outbidItemIds}
					/>
				))}
			</>
		);
	}

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
				allowStars={allowStars}
				outbidItemIds={outbidItemIds}
			/>
		</Container>
	);
};

type ItemsSectionBlockProps = {
	label?: string;
	items: Item[];
	allowStars: boolean;
	outbidItemIds?: Set<number>;
};

const ItemsSectionBlock = ({
	label,
	items,
	allowStars,
	outbidItemIds,
}: ItemsSectionBlockProps) => {
	const [sorting, setSorting] = useState<SORTING>(SORTING.MOST_RECENT);
	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => setShowSort((v) => !v);

	const sortedItems = useMemo(
		() => sortItems(items, sorting),
		[items, sorting]
	);

	return (
		<Container>
			{label && (
				<Title
					title={label}
					right={
						<TitleButton onClick={toggleSort}>
							<Sort />
						</TitleButton>
					}
				/>
			)}
			{showSort && (
				<SortButtons sorting={sorting} setSorting={setSorting} />
			)}
			<ItemsList
				items={sortedItems}
				allowStars={allowStars}
				outbidItemIds={outbidItemIds}
			/>
		</Container>
	);
};
