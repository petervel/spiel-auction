import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useOutbids } from '../../hooks/useOutbids';
import { sortItems } from '../../util';
import { EditBggUserName } from './EditBggUserName';

export const OutbidsPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const [bidder, setBidder] = useState(pathUsername ?? bggUsername);

	const { data, error, isLoading } = useOutbids({
		username: bidder ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const items = sortItems(data);

	return (
		<>
			<TabBar />
			<Container>
				<Title title="Outbid items" />
				{bidder ? (
					<ItemsList items={items} />
				) : (
					<EditBggUserName onSave={setBidder} />
				)}
			</Container>
		</>
	);
};
