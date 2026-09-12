import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton/BackButton';
import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { StarToggle } from '../../components/StarToggle/StarToggle';
import { Title } from '../../components/Title/Title';
import { useWishlist } from '../../hooks/useWishlist';
import { BggObject } from '../../model/BggObject';
import css from './ImportWishlistPage.module.css';

// BGG's own wishlist priority scale (1-5) - collection-only, per-user, not
// stored anywhere on our side. Used only to group/pre-select on this page.
const PRIORITY_LABELS: Record<number, string> = {
	1: 'Must have',
	2: 'Love to have',
	3: 'Like to have',
	4: 'Thinking about it',
	5: "Don't buy this",
};
const UNSPECIFIED_PRIORITY = 0;

type WishlistImportItem = BggObject & { wishlistPriority: number | null };

export const ImportWishlistPage = () => {
	const navigate = useNavigate();
	const { importWishlist, isImporting } = useWishlist();

	const [items, setItems] = useState<WishlistImportItem[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [selected, setSelected] = useState<Set<number>>(new Set());

	useEffect(() => {
		let cancelled = false;

		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch('/api/user/bggWishlist', {
					credentials: 'include',
				});
				const body = await res.json();
				if (!res.ok) {
					throw new Error(body?.error ?? 'Failed to fetch wishlist');
				}
				if (cancelled) return;
				const fetchedItems: WishlistImportItem[] = body.items;
				setItems(fetchedItems);
				setSelected(new Set(fetchedItems.map((i) => i.objectId)));
			} catch (err) {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : 'Failed to fetch wishlist'
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	// Grouped by BGG's wishlist priority, in that priority's order - items
	// BGG didn't give a priority for (shouldn't normally happen) land in
	// their own group at the end rather than being dropped.
	const groups = useMemo(() => {
		if (!items) return [];
		const byPriority = new Map<number, WishlistImportItem[]>();
		for (const item of items) {
			const key = item.wishlistPriority ?? UNSPECIFIED_PRIORITY;
			if (!byPriority.has(key)) byPriority.set(key, []);
			byPriority.get(key)!.push(item);
		}
		return [1, 2, 3, 4, 5, UNSPECIFIED_PRIORITY]
			.filter((priority) => byPriority.has(priority))
			.map((priority) => ({
				priority,
				label: PRIORITY_LABELS[priority] ?? 'Unspecified priority',
				items: byPriority.get(priority)!,
			}));
	}, [items]);

	const toggleSelected = (objectId: number) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(objectId)) {
				next.delete(objectId);
			} else {
				next.add(objectId);
			}
			return next;
		});
	};

	const toggleGroup = (objectIds: number[]) => {
		setSelected((prev) => {
			const next = new Set(prev);
			const allSelected = objectIds.every((id) => next.has(id));
			for (const id of objectIds) {
				if (allSelected) next.delete(id);
				else next.add(id);
			}
			return next;
		});
	};

	const allSelected = items !== null && selected.size === items.length;

	const toggleAll = () => {
		setSelected(
			allSelected ? new Set() : new Set((items ?? []).map((i) => i.objectId))
		);
	};

	const handleSubmit = () => {
		// wishlistPriority is only for this page's own grouping/pre-selection -
		// it isn't a BggObject field, so it must not be sent to the import
		// endpoint (Prisma rejects unknown fields on create/update).
		const toAdd = (items ?? [])
			.filter((item) => selected.has(item.objectId))
			.map(({ objectId, objectType, objectSubtype, objectName }) => ({
				objectId,
				objectType,
				objectSubtype,
				objectName,
			}));

		setSubmitError(null);
		importWishlist(toAdd, {
			onSuccess: () => navigate('/wishlist'),
			onError: () =>
				setSubmitError('Failed to add these games to your wishlist.'),
		});
	};

	return (
		<Container>
			<Title title="Import BGG wishlist" left={<BackButton />} />
			{loading && <Spinner />}
			{error && <Typography color="error">{error}</Typography>}
			{!loading && !error && items && (
				<Stack gap={2}>
					{items.length === 0 ? (
						<Typography color="text.secondary">
							Your BGG wishlist is empty.
						</Typography>
					) : (
						<>
							<div className={css.selectAll}>
								<StarToggle
									checked={allSelected}
									onToggle={toggleAll}
									label={allSelected ? 'Deselect all' : 'Select all'}
								/>
								<span>
									{allSelected ? 'Deselect all' : 'Select all'}
								</span>
							</div>
							{groups.map((group) => {
								const groupIds = group.items.map((i) => i.objectId);
								const groupAllSelected = groupIds.every((id) =>
									selected.has(id)
								);
								return (
									<div key={group.priority} className={css.group}>
										<div className={css.groupHeader}>
											<StarToggle
												checked={groupAllSelected}
												onToggle={() => toggleGroup(groupIds)}
												label={
													groupAllSelected
														? `Deselect all in ${group.label}`
														: `Select all in ${group.label}`
												}
											/>
											<span>
												{group.label} ({group.items.length})
											</span>
										</div>
										<ul className={css.items}>
											{group.items.map((item) => (
												<li
													key={item.objectId}
													className={css.item}
												>
													<StarToggle
														checked={selected.has(
															item.objectId
														)}
														onToggle={() =>
															toggleSelected(item.objectId)
														}
														label={`Toggle ${item.objectName}`}
													/>
													<span>{item.objectName}</span>
												</li>
											))}
										</ul>
									</div>
								);
							})}
							{submitError && (
								<Typography color="error">{submitError}</Typography>
							)}
							<Button
								variant="contained"
								disabled={selected.size === 0 || isImporting}
								onClick={handleSubmit}
							>
								{isImporting ? 'Adding...' : 'Add these games to wishlist'}
							</Button>
						</>
					)}
				</Stack>
			)}
		</Container>
	);
};
