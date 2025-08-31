import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useStarred } from '../../hooks/useStarred';
import { useUser } from '../../hooks/useUser';

export const StarredPage = () => {
	const { user, isLoading } = useUser();
	// console.log({ user, isLoading });

	const { starred } = useStarred();

	const navigate = useNavigate();
	if (isLoading) {
		return <Spinner />;
	}
	if (!user) {
		navigate('/');
		return null;
	}

	const items = starred ?? [];
	return (
		<>
			<TabBar />

			<Container>
				<Title title="Starred items" />
				<ItemsList items={items} allowStars={true} />
			</Container>
		</>
	);
};
