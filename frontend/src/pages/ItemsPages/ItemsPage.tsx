import { Sort } from '@mui/icons-material';
import { IconButton, Typography } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';
import { ItemDisplayOptions } from '../../components/AuctionItem/ItemDisplayOptions';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Title } from '../../components/Title/Title';
import { TitleButton } from '../../components/Title/TitleButton';
import { Item } from '../../model/Item';
import { SORTING, sortItems } from '../../util';
import css from './ItemsPage.module.css';
import { SortButtons } from './SortButtons';

// A labeled subset of items, kept in its own block instead of being
// interleaved with the others by sort order (see LikedPage's outbid/liked
// split). Each group sorts and toggles its sort dropdown independently -
// e.g. only the outbid group offers SORTING.OUTBID_RECENCY.
export type ItemGroup = {
	label: string;
	items: Item[];
	icon?: ReactNode;
	defaultSorting?: SORTING;
	sortOptions?: SORTING[];
};

type ItemsPageProps = {
	title: string;
	items?: Item[];
	// Renders `items` as separate labeled sections (in the given order)
	// instead of one flat, sort-interleaved list. Mutually exclusive with
	// `items`.
	groups?: ItemGroup[];
	subTitle?: ReactNode;
	// Which of `items`/`groups` are currently outbid - only meaningful
	// together with options.silentToggle, to pick the broken-heart icon for
	// those items.
	outbidItemIds?: Set<number>;
	// Buying/Selling want ended auctions pushed to the bottom regardless of
	// the chosen sort - see sortItems. Not part of `options`: it's a sort
	// concern consumed entirely here, and never reaches ItemsList/AuctionItem.
	endedLast?: boolean;
	options?: ItemDisplayOptions;
	// Only used in flat `items` mode - each group picks its own default via
	// ItemGroup.defaultSorting instead.
	defaultSorting?: SORTING;
};

export const ItemsPage = ({
	title,
	items,
	groups,
	subTitle,
	outbidItemIds,
	endedLast = false,
	options,
	defaultSorting = SORTING.MOST_RECENT,
}: ItemsPageProps) => {
	const [sorting, setSorting] = useState<SORTING>(defaultSorting);
	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => setShowSort((v) => !v);

	// Keyed by group label rather than index - stable across re-renders as
	// long as groups keep the same labels, which is all this needs.
	const [groupSorting, setGroupSorting] = useState<Record<string, SORTING>>(
		() =>
			Object.fromEntries(
				(groups ?? []).map((group) => [
					group.label,
					group.defaultSorting ?? SORTING.MOST_RECENT,
				])
			)
	);
	const [openSortLabel, setOpenSortLabel] = useState<string | null>(null);
	const toggleGroupSort = (label: string) =>
		setOpenSortLabel((current) => (current === label ? null : label));

	const visibleItems = useMemo(
		() => sortItems(items ?? [], sorting, endedLast),
		[items, sorting, endedLast]
	);

	const visibleGroups = useMemo(
		() =>
			groups?.map((group) => ({
				label: group.label,
				icon: group.icon,
				sortOptions: group.sortOptions,
				items: sortItems(
					group.items,
					groupSorting[group.label] ?? SORTING.MOST_RECENT,
					endedLast
				),
			})),
		[groups, groupSorting, endedLast]
	);

	return (
		<Container>
			<Title
				title={title}
				right={
					!groups && (
						<TitleButton onClick={toggleSort}>
							<Sort />
						</TitleButton>
					)
				}
			/>
			{subTitle}
			{!groups && showSort && (
				<SortButtons sorting={sorting} setSorting={setSorting} />
			)}
			{visibleGroups ? (
				visibleGroups.some((group) => group.items.length > 0) ? (
					visibleGroups.map(
						(group) =>
							group.items.length > 0 && (
								<div key={group.label} className={css.group}>
									<div className={css.groupHeader}>
										{group.icon}
										<Typography
											component="span"
											className={css.groupLabel}
										>
											{group.label}
										</Typography>
										<Typography
											component="span"
											className={css.groupCount}
										>
											({group.items.length})
										</Typography>
										<IconButton
											size="small"
											onClick={() => toggleGroupSort(group.label)}
											aria-label={`Sort ${group.label}`}
											aria-pressed={openSortLabel === group.label}
											sx={{ ml: 'auto', p: 0.5 }}
										>
											<Sort fontSize="small" />
										</IconButton>
									</div>
									{openSortLabel === group.label && (
										<SortButtons
											sorting={
												groupSorting[group.label] ??
												SORTING.MOST_RECENT
											}
											setSorting={(value) =>
												setGroupSorting((prev) => ({
													...prev,
													[group.label]: value,
												}))
											}
											options={group.sortOptions}
										/>
									)}
									<ItemsList
										items={group.items}
										outbidItemIds={outbidItemIds}
										options={options}
									/>
								</div>
							)
					)
				) : (
					<ItemsList items={[]} options={options} />
				)
			) : (
				<ItemsList
					items={visibleItems}
					outbidItemIds={outbidItemIds}
					options={options}
				/>
			)}
		</Container>
	);
};
