export interface User {
	uid: string;
	email: string;
	register_time: number | object;

	access_level?: 'user' | 'admin';
	bgg_username?: string;
}
