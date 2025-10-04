import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useOutbids } from '../../hooks/useOutbids';
import { ItemsPage } from './ItemsPage';

export const OutbidsPage = () => {
	const { username: pathUsername } = useParams();
	const { bggUsername, setBggUsername, removeBggUsername } = useBggUsername();

	const [bidder, setBidder] = useState(pathUsername ?? bggUsername);

	const setWrapper = (name: string | undefined) => {
		setBidder(name);
		if (name) {
			setBggUsername(name);
		} else {
			removeBggUsername();
		}
	};

	const { data, error, isLoading } = useOutbids({
		username: bidder ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<ItemsPage
			title="Outbid items"
			username={bidder}
			items={data}
			setUsername={setWrapper}
			allowStars={true}
		/>
	);
};
