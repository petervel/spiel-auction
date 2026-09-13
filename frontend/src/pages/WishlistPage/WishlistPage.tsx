import { StarBorderRounded } from '@mui/icons-material';
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
	const [sortMode, setSortMode] = useState<SortMode>('latest');
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
			list.sort((a, b) => latestPostTimestamp(b) - latestPostTimestamp(a));
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

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div>
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
								<Typography variant="h6">With auctions</Typography>
								<Select
									size="small"
									value={sortMode}
									onChange={(evt: SelectChangeEvent) =>
										setSortMode(evt.target.value as SortMode)
									}
								>
									<MenuItem value="latest">Latest auction</MenuItem>
									<MenuItem value="alphabetical">Alphabetical</MenuItem>
								</Select>
							</div>
							<ul className={css.items}>
								{sortedWithAuctions.map((object) => (
									<WishlistObjectRow
										key={object.objectId}
										object={object}
										expanded={!collapsedIds.has(object.objectId)}
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
								<Typography variant="h6">No auctions yet</Typography>
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
					<Button component={Link} to="/wishlist/import" variant="contained">
						Import from BGG
					</Button>
				</Stack>
			)}
		</Container>
	);
};
