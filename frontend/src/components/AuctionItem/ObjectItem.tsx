import { BarChartRounded } from '@mui/icons-material';
import { Stack } from '@mui/material';
import classNames from 'classnames';
import bggIcon from '../../assets/bgg.svg';
import { BggObject } from '../../hooks/useInfiniteObjects';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';
import css from './AuctionItem.module.css';

interface ObjectItemProps {
	object: BggObject;
}

export const ObjectItem = ({ object }: ObjectItemProps) => {
	return (
		<div className={css.container}>
			<Stack direction="row" gap={1}>
				<AuctionItemButton
					link={`/object/${object.objectId}`}
					tooltip="Compare with other auctions"
				>
					<BarChartRounded
						className="icon"
						sx={{ fontSize: '30px' }}
					/>
				</AuctionItemButton>

				<a
					href={`/object/${object.objectId}`}
					className={classNames(
						css.objectName,
						css.hideOverflow,
						css.displayName
					)}
				>
					{object.objectName}
				</a>

				<AuctionItemButton
					link={`https://boardgamegeek.com/${object.objectSubtype}/${object.objectId}`}
					tooltip="Look up on BGG"
				>
					<img src={bggIcon} width="30" height="30" />
				</AuctionItemButton>
			</Stack>
		</div>
	);
};
