import { Euro, SortByAlpha, Timer } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BidAmount } from '../../components/BidAmount/BidAmount';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { SORTING, sortItems } from '../../util';
import css from './BuyingPage.module.css';
import { EditBggUserName } from './EditBggUserName';
import SortToggle from './SortToggle';

export const BuyingPage = () => {
	const { username: pathUsername } = useParams();
	const bggUsername = useBggUsername();

	const [buyer, setBuyer] = useState(pathUsername ?? bggUsername);

	const [sorting, setSorting] = useState<SORTING>(SORTING.END_DATE);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		setShowSort((v) => !v);
	};

	const { data, error, isLoading } = useBids({
		buyer: buyer ?? 'this_is_just_some_nonexistent_user', // TODO: hackish fallback
	});

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const items = sortItems(data.items, sorting);

	const buttons = [
		{
			setting: SORTING.END_DATE,
			icon: <Timer />,
		},
		{
			setting: SORTING.NAME,
			icon: <SortByAlpha />,
		},
		{
			setting: SORTING.PRICE,
			icon: <Euro />,
		},
	];

	return (
		<>
			<TabBar />
			<Container>
				<Title
					title="Buying"
					right={<SortToggle toggleSort={toggleSort} />}
				/>
				{bggUsername == pathUsername && (
					<BidAmount
						amount={data.totalPrice}
						extraText={` (${items.length} items)`}
					/>
				)}
				{buyer ? (
					<>
						{showSort && (
							<Stack direction="row" justifyContent="center">
								<Stack
									direction="row"
									justifyContent="space-around"
									my={2}
									gap={5}
								>
									{buttons.map((button) => (
										<div
											className={classNames({
												[css.button]: true,
												[css.active]:
													button.setting == sorting,
											})}
											onClick={() =>
												setSorting(button.setting)
											}
										>
											{button.icon}
										</div>
									))}
								</Stack>
							</Stack>
						)}

						<ItemsList items={items} />
					</>
				) : (
					<EditBggUserName onSave={setBuyer} />
				)}
			</Container>
			<div className={css.hint}>
				Psst.. Do you want to see the items you were{' '}
				<a href="/outbids">outbid</a> on?
			</div>
		</>
	);
};
