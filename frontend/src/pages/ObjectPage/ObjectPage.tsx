import { useNavigate, useParams } from 'react-router';
import { Spinner } from '../../components/Spinner/Spinner';
import { useObject } from '../../hooks/useObject';
import { ItemsPage } from '../ItemsPage/ItemsPage';

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

	return <ItemsPage title={title} items={data} />;
};
