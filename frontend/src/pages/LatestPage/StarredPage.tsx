import { Link } from '@mui/material';
import { Container } from '../../components/Container/Container';
import { NotReadyMessage } from '../../components/NotReadyMessage/NotReadyMessage';
import { Spinner } from '../../components/Spinner/Spinner';
import { useOutbids } from '../../hooks/useOutbids';
import { useStarred } from '../../hooks/useStarred';
import { useUser } from '../../hooks/useUser';
import { ItemsPage } from '../ItemsPages/ItemsPage';

export const StarredPage = () => {
	const { user, isLoading: userLoading, openLoginDialog } = useUser();
	const { starred, isLoading: starredLoading } = useStarred();
	const {
		data: outbidsData,
		isLoading: outbidsLoading,
		error: outbidsError,
	} = useOutbids({ bidder: user?.bggUsername });

	if (userLoading) return <Spinner />;

	if (!user) {
		return (
			<Container>
				<div>
					<Link component="button" onClick={openLoginDialog}>
						Log in
					</Link>{' '}
					to see your outbid and starred items.
				</div>
			</Container>
		);
	}

	if (starredLoading || outbidsLoading) return <Spinner />;

	if ((outbidsError as Error)?.message === 'not_ready') {
		return <NotReadyMessage />;
	}

	const outbidItems = outbidsData?.items ?? [];
	const outbidItemIds = new Set(outbidItems.map((item) => item.id));

	// Don't show an item under Starred if it's already shown under Outbid.
	const starredItems = (starred?.items ?? []).filter(
		(item) => !outbidItemIds.has(item.id)
	);

	return (
		<>
			<ItemsPage title="Outbid" items={outbidItems} allowStars={true} />
			<ItemsPage
				title="Starred"
				items={starredItems}
				allowStars={true}
			/>
		</>
	);
};
