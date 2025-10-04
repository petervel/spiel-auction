import { BidAmount } from "../../components/BidAmount/BidAmount";
import { useBids } from "../../hooks/useBids";
import { UserItemsPage } from "../ItemsPages/UserItemsPage";

export const SellingPage = () => (
	<UserItemsPage
		title="Selling"
		hook={useBids}
		paramMapper={(username) => ({ seller: username })}
		formatSubtitle={(data, isOwnPage) =>
			isOwnPage && data &&  (
				<BidAmount
					amount={data.totalPrice}
					extraText={` (${data.items.filter((i: any) => i.hasBids).length} of ${data.items.length} sold)`}
				/>
			)
		}
	/>
);
