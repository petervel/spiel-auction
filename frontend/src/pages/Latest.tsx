import useItems from '../hooks/useItems';

type Item = {
	id: number;
	objectName: string;
};
const Latest = () => {
	const { data, isLoading, error } = useItems();

	if (isLoading) return <div>Loading...</div>;
	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	return (
		<div>
			<ul>
				{data.map((item: Item) => (
					<li key={item.id}>{item.objectName}</li>
				))}
			</ul>
		</div>
	);
};

export default Latest;
