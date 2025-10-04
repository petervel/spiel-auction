import { useNavigate } from 'react-router-dom';
import { useStarred } from '../../hooks/useStarred';
import { useUser } from '../../hooks/useUser';
import { ItemsPage } from '../ItemsPages/ItemsPage';

export const StarredPage = () => {
	const { user, isLoading } = useUser();
	const { starred } = useStarred();

	const navigate = useNavigate();
	if (isLoading) return null; // optional: show <Spinner /> if you want
	if (!starred) return null;
	if (!user) {
		navigate('/');
		return null;
	}


	return (
		<ItemsPage
			title="Starred items"
			username={user.bggUsername} // or just a string identifier if you want
			items={starred.items}
			setUsername={() => {}} // not editable here
			allowStars={true}
		/>
	);
};
