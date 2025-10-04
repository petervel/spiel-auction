import { UserItemsPage } from "../ItemsPages/UserItemsPage";
import { useOutbids } from "../../hooks/useOutbids";

export const OutbidsPage = () => (
	<UserItemsPage
		title="Outbid items"
		hook={useOutbids}
		paramMapper={(username) => ({ bidder: username })}
		extraProps={{ allowStars: true }}
	/>
);
