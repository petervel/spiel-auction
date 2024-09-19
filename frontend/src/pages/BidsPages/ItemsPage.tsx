import { Euro, SortByAlpha, Timer } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import { ReactNode, useState } from 'react';
import { Container } from '../../components/Container/Container';
import { ItemsList } from '../../components/ItemsList/ItemsList';
import { Title } from '../../components/Title/Title';
import { Item } from '../../model/Item';
import { SORTING, sortItems } from '../../util';
import css from './BuyingPage.module.css';
import { EditBggUserName } from './EditBggUserName';
import SortToggle from './SortToggle';

type ItemsPageProps = {
	title: string;
	username?: string;
	items: Item[];
	subTitle?: ReactNode;
	setUsername: (_: string | undefined) => void;
};

export const ItemsPage = ({
	title,
	username,
	items,
	subTitle,
	setUsername,
}: ItemsPageProps) => {
	const [sorting, setSorting] = useState<SORTING>(SORTING.END_DATE);

	const [showSort, setShowSort] = useState(false);
	const toggleSort = () => {
		setShowSort((v) => !v);
	};

	const sortedItems = sortItems(items, sorting);

	return (
		<>
			<Container>
				<Title
					title={title}
					right={<SortToggle toggleSort={toggleSort} />}
				/>
				{subTitle}
				{username ? (
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

						<ItemsList items={sortedItems} />
					</>
				) : (
					<EditBggUserName onSave={setUsername} />
				)}
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
