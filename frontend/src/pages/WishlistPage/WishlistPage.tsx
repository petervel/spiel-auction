import {
	ExpandLessRounded,
	ExpandMoreRounded,
	StarBorderRounded,
} from '@mui/icons-material';
import {
	Button,
	MenuItem,
	Select,
	SelectChangeEvent,
	Stack,
	Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WishlistObjectRow } from '../../components/AuctionItem/WishlistObjectRow';
import { Container } from '../../components/Container/Container';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import useLocalStorage from '../../hooks/useLocalStorage';
import { useRememberSorting } from '../../hooks/useRememberSorting';
import { useUser } from '../../hooks/useUser';
import { useWishlist, WishlistObject } from '../../hooks/useWishlist';
import css from './WishlistPage.module.css';

type SortMode = 'latest' | 'alphabetical';

// Each object's items are already ordered newest-first by the backend, so
// the first one is that object's most recent auction listing.
const latestPostTimestamp = (object: WishlistObject) =>
	object.items[0]?.postTimestamp ?? 0;

export const WishlistPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const { wishlist, isLoading: wishlistLoading } = useWishlist();
	const { rememberSorting } = useRememberSorting();
	const [storedSortMode, setStoredSortMode] = useLocalStorage<SortMode>(
		'sort:wishlist',
		'latest',
	);
	const [sortMode, setSortModeState] = useState<SortMode>(() =>
		rememberSorting ? storedSortMode : 'latest',
	);
	const setSortMode = (value: SortMode) => {
		setSortModeState(value);
		if (rememberSorting) setStoredSortMode(value);
	};
	// Collapsed object ids - everything starts expanded, so this only ever
	// needs to track exceptions to that default.
	const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

	const objects = wishlist?.objects ?? [];

	const { withAuctions, withoutAuctions } = useMemo(() => {
		const all = wishlist?.objects ?? [];
		return {
			withAuctions: all.filter((o) => o.items.length > 0),
			withoutAuctions: all.filter((o) => o.items.length === 0),
		};
	}, [wishlist]);

	const sortedWithAuctions = useMemo(() => {
		const list = [...withAuctions];
		if (sortMode === 'alphabetical') {
			list.sort((a, b) => a.objectName.localeCompare(b.objectName));
		} else {
			list.sort(
				(a, b) => latestPostTimestamp(b) - latestPostTimestamp(a),
			);
		}
		return list;
	}, [withAuctions, sortMode]);

	const toggleExpanded = (objectId: number) => {
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(objectId)) next.delete(objectId);
			else next.add(objectId);
			return next;
		});
	};

	// Toggles based on whether anything's currently expanded - matches the
	// usual "select all" pattern: collapse everything if any row is open,
	// otherwise expand everything.
	const allExpanded = sortedWithAuctions.every(
		(object) => !collapsedIds.has(object.objectId),
	);
	const toggleAllExpanded = () => {
		setCollapsedIds(
			allExpanded
				? new Set(sortedWithAuctions.map((object) => object.objectId))
				: new Set(),
		);
	};

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div style={{ padding: '2rem' }}>
				<LoginLink /> to see your wishlist.
			</div>
		);
	}

	if (wishlistLoading) return <Spinner />;

	return (
		<Container>
			<Title title="Wishlist" />
			{objects.length ? (
				<Stack gap={4}>
					{sortedWithAuctions.length > 0 && (
						<div className={css.section}>
							<div className={css.sectionHeader}>
								<Typography variant="h6">
									With auctions
								</Typography>
								<Stack
									direction="row"
									gap={1}
									alignItems="center"
								>
									<Button
										size="small"
										startIcon={
											allExpanded ? (
												<ExpandLessRounded />
											) : (
												<ExpandMoreRounded />
											)
										}
										onClick={toggleAllExpanded}
									>
										{allExpanded
											? 'Collapse all'
											: 'Expand all'}
									</Button>
									<Select
										size="small"
										value={sortMode}
										onChange={(evt: SelectChangeEvent) =>
											setSortMode(
												evt.target.value as SortMode,
											)
										}
									>
										<MenuItem value="latest">
											Latest auction
										</MenuItem>
										<MenuItem value="alphabetical">
											Alphabetical
										</MenuItem>
									</Select>
								</Stack>
							</div>
							<ul className={css.items}>
								{sortedWithAuctions.map((object) => (
									<WishlistObjectRow
										key={object.objectId}
										object={object}
										expanded={
											!collapsedIds.has(object.objectId)
										}
										onToggleExpand={() =>
											toggleExpanded(object.objectId)
										}
									/>
								))}
							</ul>
						</div>
					)}

					{withoutAuctions.length > 0 && (
						<div className={css.section}>
							<div className={css.sectionHeader}>
								<Typography variant="h6">
									No auctions yet
								</Typography>
							</div>
							<ul className={css.items}>
								{withoutAuctions.map((object) => (
									<WishlistObjectRow
										key={object.objectId}
										object={object}
										expanded={false}
										onToggleExpand={() => {}}
									/>
								))}
							</ul>
						</div>
					)}
				</Stack>
			) : (
				<Stack alignItems="center" gap={2} className={css.empty}>
					<StarBorderRounded
						className={css.emptyIcon}
						style={{ fontSize: '3rem' }}
					/>
					<Typography color="text.secondary">
						No games on your wishlist yet.
					</Typography>
					<Button
						component={Link}
						to="/wishlist/import"
						variant="contained"
					>
						Import from BGG
					</Button>
				</Stack>
			)}
		</Container>
	);
};
