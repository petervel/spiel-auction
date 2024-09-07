import { BggObject } from '../../hooks/useObjects';
import { ObjectItem } from '../AuctionItem/ObjectItem';
import css from './ItemsList.module.css';

type ItemsListProps = {
	objects: BggObject[];
};

export const ObjectsList = ({ objects }: ItemsListProps) => {
	return (
		<ul className={css.items}>
			{objects.length ? (
				objects.map((object) => (
					<ObjectItem key={object.objectId} object={object} />
				))
			) : (
				<div className={css.noItems}>No objects found.</div>
			)}
		</ul>
	);
};
