import { LoginLink } from '../../components/LoginLink/LoginLink';
import { NotReadyMessage } from '../../components/NotReadyMessage/NotReadyMessage';
import { Spinner } from '../../components/Spinner/Spinner';
import { useLiked } from '../../hooks/useLiked';
import { useOutbids } from '../../hooks/useOutbids';
import { useUser } from '../../hooks/useUser';
import { ItemsPage } from '../ItemsPages/ItemsPage';

export const LikedPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const { liked, isLoading: likedLoading } = useLiked();
	const {
		data: outbidsData,
		isLoading: outbidsLoading,
		error: outbidsError,
	} = useOutbids({ bidder: user?.bggUsername });

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div>
				<LoginLink /> to see your outbid and liked items.
			</div>
		);
	}

	if (likedLoading || outbidsLoading) return <Spinner />;

	if ((outbidsError as Error)?.message === 'not_ready') {
		return <NotReadyMessage />;
	}

	const outbidItems = outbidsData?.items ?? [];
	const outbidItemIds = new Set(outbidItems.map((item) => item.id));

	// An outbid item that's also liked only shows in the Outbid section.
	const likedOnlyItems = (liked?.items ?? []).filter(
		(item) => !outbidItemIds.has(item.id)
	);

	return (
		<ItemsPage
			title="Outbid & Liked"
			sections={[
				{ label: 'Outbid', items: outbidItems },
				{ label: 'Liked', items: likedOnlyItems },
			]}
			allowLikes={true}
			outbidItemIds={outbidItemIds}
		/>
	);
};
