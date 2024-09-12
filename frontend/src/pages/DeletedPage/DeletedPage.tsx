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

	return (
		<>
			<TabBar />
			<Container>
				<Title title="Deleted items" />
				<ul>
					{Object.keys(data.items)
						.sort(
							(username1, username2) =>
								getLatestLastSeen(data.items[username2]) -
								getLatestLastSeen(data.items[username1])
						)
						.map((username) => (
							<UserDeletedItems
								key={username}
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
					{Object.keys(data.comments)
						.sort(
							(username1, username2) =>
								getLatestLastSeen(data.comments[username2]) -
								getLatestLastSeen(data.comments[username1])
						)
						.map((username) => (
							<UserDeletedComments
								key={username}
								username={username}
								latestTimestamp={getLatestLastSeen(
									data.comments[username]
								)}
								comments={data.comments[username]}
							/>
						))}
				</ul>
			</Container>
		</>
	);
};

const getLatestLastSeen = (items: Item[] | ItemComment[]) =>
	Math.max(...items.map((item) => item.lastSeen));

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
				{formatTimestamp(latestTimestamp)}
			</span>
			<ul>
				{items
					.sort((item1, item2) => item2.lastSeen - item1.lastSeen)
					.map((item) => {
						return (
							<li key={item.id}>
								<a
									href={`https://boardgamegeek.com/${item.objectSubtype}/${item.objectId}`}
									target="_blank"
								>
									{item.objectName}
								</a>
								<div className={css.datetime}>
									posted:{' '}
									{formatTimestamp(item.postTimestamp)}
								</div>
								<div className={css.datetime}>
									removed: {formatTimestamp(item.lastSeen)}
								</div>
							</li>
						);
					})}
			</ul>
		</li>
	);
};

type UserDeletedCommentsProps = {
	username: string;
	latestTimestamp: number;
	comments: ItemComment[];
};
const UserDeletedComments = ({
	username,
	latestTimestamp,
	comments,
}: UserDeletedCommentsProps) => {
	const listId = useListId();

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
				{formatTimestamp(latestTimestamp)}
			</span>
			<ul>
				{comments
					.sort(
						(comment1, comment2) =>
							comment2.lastSeen - comment1.lastSeen
					)
					.map((comment, idx) => {
						return (
							<li key={idx}>
								<a
									href={`https://boardgamegeek.com/geeklist/${listId}?itemid=${comment.itemId}`}
									target="_blank"
								>
									{comment.text}
								</a>
								<div className={css.datetime}>
									posted:{' '}
									{formatTimestamp(comment.postTimestamp)}
								</div>
								<div className={css.datetime}>
									removed: {formatTimestamp(comment.lastSeen)}
								</div>
							</li>
						);
					})}
			</ul>
		</li>
	);
};
