import { LoginLink } from '../../components/LoginLink/LoginLink';
import { NotReadyMessage } from '../../components/NotReadyMessage/NotReadyMessage';
import { Spinner } from '../../components/Spinner/Spinner';
import { useLiked } from '../../hooks/useLiked';
import { useOutbids } from '../../hooks/useOutbids';
import { useUser } from '../../hooks/useUser';
import { Item } from '../../model/Item';
import { ItemsPage } from '../ItemsPages/ItemsPage';

export const LikedPage = () => {
	const { user, isLoading: userLoading } = useUser();
	// This page shows a frozen snapshot: no polling, and unliking an item
	// doesn't refetch, so it stays put until the page is reloaded.
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
	const likedItemIds = new Set(likedItems.map((item) => item.id));

	// Bidding auto-likes an item (see backend/src/importer/likedItems.ts),
	// so being outbid only keeps an item here while it's still liked -
	// unliking it removes it from this list entirely, not just the outbid
	// part of it.
	const outbidItems = (outbidsData?.items ?? []).filter(
		(item) => likedItemIds.has(item.id) && !isWinning(item)
	);
	const outbidItemIds = new Set(outbidItems.map((item) => item.id));

	// Liked-only items are everything else: manually liked (or bid on),
	// but not currently outbid or won.
	const likedOnlyItems = likedItems.filter(
		(item) => !outbidItemIds.has(item.id) && !isWinning(item)
	);

	// One combined, sorted-together list - outbidItemIds below is what
	// still tells each item's heart apart (broken vs. normal).
	const items = [...outbidItems, ...likedOnlyItems];

	return (
		<ItemsPage
			title="Outbid & Liked"
			items={items}
			outbidItemIds={outbidItemIds}
			options={{ silentToggle: true }}
		/>
	);
};
