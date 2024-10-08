import { PropsWithChildren } from 'react';
import css from './Container.module.css';

export const Container = ({ children }: PropsWithChildren) => {
	return <div className={css.container}>{children}</div>;
};
