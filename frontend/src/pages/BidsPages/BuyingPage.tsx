import { BidAmount } from "../../components/BidAmount/BidAmount";
import { useBids } from "../../hooks/useBids";
import { UserItemsPage } from "../ItemsPages/UserItemsPage";

export const BuyingPage = () => (
	<UserItemsPage
		title="Buying"
		hook={useBids}
		paramMapper={(username) => ({ buyer: username })}
		formatSubtitle={(data, isOwnPage) =>
			isOwnPage && data && (
				<BidAmount
					amount={data.totalPrice}
					extraText={` (${data.items.length} items)`}
				/>
			)
		}
	/>
);
