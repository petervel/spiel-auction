import { FavoriteRounded, HeartBrokenRounded } from '@mui/icons-material';
import { LoginLink } from '../../components/LoginLink/LoginLink';
import { NotReadyMessage } from '../../components/NotReadyMessage/NotReadyMessage';
import { Spinner } from '../../components/Spinner/Spinner';
import { useLiked } from '../../hooks/useLiked';
import { useOutbids } from '../../hooks/useOutbids';
import { useUser } from '../../hooks/useUser';
import { Item } from '../../model/Item';
import { DEFAULT_SORT_OPTIONS, SORTING } from '../../util';
import { ItemsPage } from '../ItemsPages/ItemsPage';

const iconSx = { fontSize: '1rem', color: 'var(--color-heart)' };

export const LikedPage = () => {
	const { user, isLoading: userLoading } = useUser();
	// This page shows a frozen snapshot: no polling, and unliking/dismissing
	// an item doesn't refetch, so it stays put until the page is reloaded.
	const { liked, isLoading: likedLoading } = useLiked({ poll: false });
	const {
		data: outbidsData,
		isLoading: outbidsLoading,
		error: outbidsError,
	} = useOutbids({ bidder: user?.bggUsername, poll: false });

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div style={{ padding: '2rem' }}>
				<LoginLink /> to see your outbid and liked items.
			</div>
		);
	}

	if (likedLoading || outbidsLoading) return <Spinner />;

	if ((outbidsError as Error)?.message === 'not_ready') {
		return <NotReadyMessage />;
	}

	// Items you're currently winning belong on the Buying tab, not here.
	const isWinning = (item: Item) =>
		!!user.bggUsername &&
		item.highestBidder?.toLowerCase() === user.bggUsername.toLowerCase();

	const likedItems = liked?.items ?? [];

	// /api/outbids is authoritative on its own (username/bid based) and
	// already excludes anything dismissed (see backend/src/api/outbids) -
	// no longer gated on being liked, so a shared-BGG-account auto-like gap
	// (see usersByBggUsername.ts) can't hide a real outbid item anymore.
	const outbidItems = (outbidsData?.items ?? []).filter(
		(item) => !isWinning(item)
	);
	const outbidItemIds = new Set(outbidItems.map((item) => item.id));

	// Liked-only items are everything else: manually liked (or bid on),
	// but not currently outbid or won.
	const likedOnlyItems = likedItems.filter(
		(item) => !outbidItemIds.has(item.id) && !isWinning(item)
	);

	return (
		<ItemsPage
			title="Outbid & Liked"
			groups={[
				{
					label: 'Outbid',
					items: outbidItems,
					icon: <HeartBrokenRounded sx={iconSx} />,
					defaultSorting: SORTING.OUTBID_RECENCY,
					sortOptions: [SORTING.OUTBID_RECENCY, ...DEFAULT_SORT_OPTIONS],
				},
				{
					label: 'Liked',
					items: likedOnlyItems,
					icon: <FavoriteRounded sx={iconSx} />,
				},
			]}
			outbidItemIds={outbidItemIds}
			options={{ silentToggle: true }}
		/>
	);
};
