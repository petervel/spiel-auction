import { useNavigate, useParams } from 'react-router';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useObject } from '../../hooks/useObject';

export const ObjectPage = () => {
	const { objectId } = useParams();
	const navigate = useNavigate();

	if (!objectId) {
		navigate('/');
	}
	const { data, isLoading, error } = useObject(Number(objectId));

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!data) {
		return <div>Error: failed to load data.</div>;
	}

	const title = data.length ? data[0].objectName : `Object #${objectId}`;

	return (
		<>
			<TabBar />
			<Container>
				<Title title={title} />
				<ItemsList items={data} allowStars={true} />
			</Container>
		</>
	);
};
