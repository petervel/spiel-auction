import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { TabBar } from '../../components/TabBar/TabBar';
import { Title } from '../../components/Title/Title';
import { useDeleted } from '../../hooks/useDeleted';
import useListId from '../../hooks/useListId';
import { Item } from '../../model/Item';
import { ItemComment } from '../../model/ItemComment';
import css from './DeletedPage.module.css';

export const DeletedPage = () => {
	const { data, isLoading, error } = useDeleted();

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!data) {
		return <div>Error: failed to load data.</div>;
	}

	const getLatestLastSeen = (items: Item[]) =>
		Math.max(...items.map((item) => item.lastSeen));

	return (
		<>
			<TabBar />
			<Container>
				<Title title="Deleted items" />
				<ul>
					{Object.keys(data.items)
						.sort((username) =>
							getLatestLastSeen(data.items[username])
						)
						.map((username) => (
							<UserDeletedItems
								username={username}
								latestTimestamp={getLatestLastSeen(
									data.items[username]
								)}
								items={data.items[username]}
							/>
						))}
				</ul>
			</Container>

			<Container>
				<Title title="Deleted comments" />
				<ul>
					{Object.keys(data.comments).map((username) => (
						<UserDeletedComments
							username={username}
							comments={data.comments[username]}
						/>
					))}
				</ul>
			</Container>
		</>
	);
};

type UserDeletedItemsProps = {
	username: string;
	latestTimestamp: number;
	items: Item[];
};
const UserDeletedItems = ({
	username,
	items,
	latestTimestamp,
}: UserDeletedItemsProps) => {
	const formatTimestamp = (timestamp: number) =>
		new Date(1000 * timestamp).toLocaleString();

	return (
		<li className={css.listItem}>
			<a
				href={`https://boardgamegeek.com/user/${username}`}
				target="_blank"
				className={css.username}
			>
				{username}
			</a>
			<span className={css.datetime}>
				({formatTimestamp(latestTimestamp)})
			</span>
			<ul>
				{items.map((item) => {
					return (
						<li>
							<a
								href={`https://boardgamegeek.com/${item.objectSubtype}/${item.objectId}`}
								target="_blank"
							>
								{item.objectName}
								<span className={css.datetime}>
									{formatTimestamp(item.lastSeen)}
								</span>
							</a>
						</li>
					);
				})}
			</ul>
		</li>
	);
};

type UserDeletedCommentsProps = {
	username: string;
	comments: ItemComment[];
};
const UserDeletedComments = ({
	username,
	comments,
}: UserDeletedCommentsProps) => {
	const listId = useListId();

	const latestTimestamp = Math.max(...comments.map((item) => item.lastSeen));

	const formatTimestamp = (timestamp: number) =>
		new Date(1000 * timestamp).toLocaleString();

	return (
		<li className={css.listItem}>
			<a
				href={`https://boardgamegeek.com/user/${username}`}
				target="_blank"
				className={css.username}
			>
				{username}
			</a>
			<span className={css.datetime}>
				({formatTimestamp(latestTimestamp)})
			</span>
			<ul>
				{comments.map((comment) => {
					return (
						<li>
							<a
								href={`https://boardgamegeek.com/geeklist/${listId}?itemid=${comment.itemId}`}
								target="_blank"
							>
								{comment.text}
								<span className={css.datetime}>
									{formatTimestamp(comment.lastSeen)}
								</span>
							</a>
						</li>
					);
				})}
			</ul>
		</li>
	);
};
