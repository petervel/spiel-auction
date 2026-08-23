import { LoginLink } from '../../components/LoginLink/LoginLink';
import { NotReadyMessage } from '../../components/NotReadyMessage/NotReadyMessage';
import { Spinner } from '../../components/Spinner/Spinner';
import { useOutbids } from '../../hooks/useOutbids';
import { useStarred } from '../../hooks/useStarred';
import { useUser } from '../../hooks/useUser';
import { ItemsPage } from '../ItemsPages/ItemsPage';

export const StarredPage = () => {
	const { user, isLoading: userLoading } = useUser();
	const { starred, isLoading: starredLoading } = useStarred();
	const {
		data: outbidsData,
		isLoading: outbidsLoading,
		error: outbidsError,
	} = useOutbids({ bidder: user?.bggUsername });

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<div>
				<LoginLink /> to see your outbid and starred items.
			</div>
		);
	}

	if (starredLoading || outbidsLoading) return <Spinner />;

	if ((outbidsError as Error)?.message === 'not_ready') {
		return <NotReadyMessage />;
	}

	const outbidItems = outbidsData?.items ?? [];
	const outbidItemIds = new Set(outbidItems.map((item) => item.id));

	// An outbid item that's also starred only shows in the Outbid section.
	const starredOnlyItems = (starred?.items ?? []).filter(
		(item) => !outbidItemIds.has(item.id)
	);

	return (
		<ItemsPage
			title="Outbid & Starred"
			sections={[
				{ label: 'Outbid', items: outbidItems },
				{ label: 'Starred', items: starredOnlyItems },
			]}
			allowStars={true}
			outbidItemIds={outbidItemIds}
		/>
	);
};
