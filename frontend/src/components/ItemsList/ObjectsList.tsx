import { BggObject } from '../../hooks/useInfiniteObjects';
import { ObjectItem } from '../AuctionItem/ObjectItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	objects: BggObject[];
	search: string | undefined;
};

export const ObjectsList = ({ objects, search }: ItemsListProps) => {
	return (
		<ul className={css.items}>
			{objects.length
				? objects.map((object) => (
						<ObjectItem key={object.objectId} object={object} />
				  ))
				: search && (
						<div className={css.noItems}>No objects found.</div>
				  )}
		</ul>
	);
};
