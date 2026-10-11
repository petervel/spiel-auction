import classNames from 'classnames';
import css from './BggUserLink.module.css';

export const BggUserLink = ({
	username,
	bold = false,
}: {
	username: string;
	bold?: boolean;
}) => (
	<a
		href={`https://boardgamegeek.com/user/${username}`}
		target="_blank"
		rel="noreferrer"
		className={classNames({ [css.bold]: bold })}
	>
		{username}
	</a>
);
