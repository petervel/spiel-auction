import { useQuery } from 'react-query';
import { Item } from '../model/Item';
import { ItemComment } from '../model/ItemComment';
import { useListId } from './useListId';

type Deleted = {
	items: Item[];
	itemComments: ItemComment[];
};
const fetchObject = async (listId: number) => {
	const response = await fetch(`/api/deleted/${listId}`);
	if (!response.ok) {
		throw new Error('Error fetching items');
	}
	const result: Deleted = await response.json();
	console.log({ result });
	const { items, itemComments } = result;

	console.log({ items, itemComments });

	const groupedItems: Record<string, Item[]> = {};
	for (const item of items) {
		const userItems = groupedItems[item.username] ?? [];
		userItems.push(item);
		groupedItems[item.username] = userItems;
	}

	const groupedItemComments: Record<string, ItemComment[]> = {};
	for (const itemComment of itemComments) {
		const userItemComments =
			groupedItemComments[itemComment.username] ?? [];
		userItemComments.push(itemComment);
		groupedItemComments[itemComment.username] = userItemComments;
	}

	return { items: groupedItems, comments: groupedItemComments };
};

export const useDeleted = () => {
	const listId = useListId();

	return useQuery(`deleted`, () => fetchObject(listId), {
		retry: 3,
		refetchInterval: 60 * 1000, // once per minute
	});
};
