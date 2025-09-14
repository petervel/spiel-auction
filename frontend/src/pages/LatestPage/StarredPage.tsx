import { Euro, SortByAlpha, Timer } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useStarred } from '../../hooks/useStarred';
import { useUser } from '../../hooks/useUser';
import { SORTING, sortItems } from '../../util';
import css from '../BidsPages/BuyingPage.module.css';
import SortToggle from '../BidsPages/SortToggle';

export const StarredPage = () => {
	const { user, isLoading } = useUser();
	// console.log({ user, isLoading });

	const { starred } = useStarred();

	const [sorting, setSorting] = useState<SORTING>(SORTING.END_DATE);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => {
		setShowSort((v) => !v);
	};

	const navigate = useNavigate();
	if (isLoading) {
		return <Spinner />;
	}
	if (!user) {
		navigate('/');
		return null;
	}

	const items = starred ?? [];
	const sortedItems = sortItems(items, sorting);

	return (
		<>
			<TabBar />

			<Container>
				<Title
					title="Starred items"
					right={<SortToggle toggleSort={toggleSort} />}
				/>

				<>
					{showSort && (
						<Stack direction="row" justifyContent="center">
							<Stack
								direction="row"
								justifyContent="space-around"
								my={2}
								gap={5}
							>
								{SORT_BUTTONS.map((button) => (
									<div
										key={button.setting}
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

					<ItemsList items={sortedItems} allowStars={true} />
				</>
			</Container>
		</>
	);
};

const SORT_BUTTONS = [
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
