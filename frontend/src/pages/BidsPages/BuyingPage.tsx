import { BidAmount } from "../../components/BidAmount/BidAmount";
import { useBids } from "../../hooks/useBids";
import { DEFAULT_SORT_OPTIONS, SORTING } from "../../util";
import { UserItemsPage } from "../ItemsPages/UserItemsPage";

export const BuyingPage = () => (
	<UserItemsPage
		title="Buying"
		hook={useBids}
		paramMapper={(username) => ({ buyer: username })}
		extraProps={{
			endedLast: true,
			sortOptions: [SORTING.LATEST_ACTIVITY, ...DEFAULT_SORT_OPTIONS],
		}}
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
