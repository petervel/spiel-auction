import bggIcon from '../../assets/bgg.svg';
import AuctionItemButton from '../AuctionItemButton/AuctionItemButton';

type Props = {
	objectSubtype: string;
	objectId: number;
};

export const BggLookupButton = ({ objectSubtype, objectId }: Props) => (
	<AuctionItemButton
		link={`https://boardgamegeek.com/${objectSubtype}/${objectId}`}
		tooltip="Look up on BGG"
		newTab
	>
		<img src={bggIcon} width="30" height="30" />
	</AuctionItemButton>
);
