import { Link } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useUser } from '../../hooks/useUser';
import { EditBggUserName } from './EditBggUserName';
import { ItemsPage } from './ItemsPage';

interface UserItemsPageProps<TParams, TData> {
	title: string;
	hook: (params: TParams) => {
		data: TData | undefined;
		isLoading: boolean;
		error: unknown;
	};
	paramMapper: (username: string) => TParams;
	formatSubtitle?: (data: TData, isOwnPage: boolean) => React.ReactNode;
	extraProps?: Partial<React.ComponentProps<typeof ItemsPage>>;
}

export const UserItemsPage = <TParams, TData extends { items: any[] }>({
	title,
	hook,
	paramMapper,
	formatSubtitle,
	extraProps,
}: UserItemsPageProps<TParams, TData>) => {
	const { username: pathUsername } = useParams();
	const { user, isLoading: userLoading, openLoginDialog } = useUser();
	const { bggUsername, setBggUsername, isOwnName, activeName } =
		useBggUsername(pathUsername);

	const navigate = useNavigate();
	useEffect(() => {
		if (!pathUsername && bggUsername) {
			navigate(bggUsername);
		}
	}, [pathUsername, bggUsername]);

	const params = activeName ? paramMapper(activeName) : ({} as TParams);
	const { data, error, isLoading } = hook(params);

	if (userLoading) return <Spinner />;
	if (!activeName) {
		if (!user)
			return (
				<div>
					<Link component="button" onClick={openLoginDialog}>
						Log in
					</Link>{' '}
					to see your items.
				</div>
			);
		return <EditBggUserName onSave={setBggUsername} />;
	}
	if (isLoading || !data) return <Spinner />;
	if (error) return <div>Error: {(error as Error).message}</div>;

	return (
		<ItemsPage
			title={title}
			items={data.items}
			subTitle={formatSubtitle?.(data, isOwnName)}
			{...extraProps}
		/>
	);
};
