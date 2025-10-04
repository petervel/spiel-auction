import classNames from 'classnames';
import { Container } from '../../components/Container/Container';
import { Spinner } from '../../components/Spinner/Spinner';
import { Title } from '../../components/Title/Title';
import { UserDupes, useDuplicates } from '../../hooks/useDuplicates';
import { useListId } from '../../hooks/useListId';
import css from './DuplicatesPage.module.css';

export const DuplicatesPage = () => {
	const { data: items, isLoading, error } = useDuplicates();

	if (isLoading) return <Spinner />;

	if (error) {
		const typedError = error as Error;
		return <div>Error: {typedError.message}</div>;
	}

	if (!items) {
		return <div>Error: failed to load data.</div>;
	}

	return (
		<Container>
			<Title title="Duplicates" />
			<ul>
				{items.map((userDupes) => (
					<UserDuplicates userDupes={userDupes} />
				))}
			</ul>
		</Container>
	);
};

type UserDuplicatesProps = {
	userDupes: UserDupes;
};
const UserDuplicates = ({ userDupes }: UserDuplicatesProps) => {
	const listId = useListId();

	const formatTimestamp = (timestamp: number) =>
		new Date(1000 * timestamp).toLocaleString();

	return (
		<li className={css.listItem}>
			<a
				href={`https://boardgamegeek.com/user/${userDupes.username}`}
				target="_blank"
				className={css.username}
			>
				{userDupes.username}
			</a>
			<span className={css.datetime}>
				({formatTimestamp(userDupes.latestTimestamp)})
			</span>
			<ul>
				{userDupes.dupes.map((userDupe) => {
					return (
						<li>
							<a
								href={`https://boardgamegeek.com/${userDupe.items[0].objectSubtype}/${userDupe.items[0].objectId}`}
								target="_blank"
							>
								{userDupe.objectName}
							</a>
							<ul>
								{userDupe.items.map((item) => {
									return (
										<li>
											<a
												href={`https://boardgamegeek.com/geeklist/${listId}?itemid=${item.id}`}
												target="_blank"
												className={classNames({
													[css.deleted]: item.deleted,
												})}
											>
												<span className={css.auctionId}>
													{item.id}
												</span>
												<span className={css.datetime}>
													edited:{' '}
													{formatTimestamp(
														item.editTimestamp
													)}
												</span>
											</a>
										</li>
									);
								})}
							</ul>
						</li>
					);
				})}
			</ul>
		</li>
	);
};
