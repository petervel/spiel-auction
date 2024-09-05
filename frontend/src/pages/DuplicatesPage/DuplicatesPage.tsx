import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useDuplicates } from '../../hooks/useDuplicates';

export const DuplicatesPage = () => {
	const { data: items, isLoading, error } = useDuplicates();

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!items) {
		return <div>Error: failed to load data.</div>;
	}

	return (
		<>
			<TabBar />
			<Container>
				<Title title="Duplicates" />
				<ItemsList items={items} />
			</Container>
		</>
	);
};
