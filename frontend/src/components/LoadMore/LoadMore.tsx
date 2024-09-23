import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Spinner } from '../Spinner/Spinner';
import css from './LoadMore.module.css';

type LoadMoreProps = {
	isLoading: boolean;
	hasMore: boolean;
	loadMore: () => void;
};
export const LoadMore = ({ isLoading, hasMore, loadMore }: LoadMoreProps) => {
	const [ref, inView] = useInView({
		triggerOnce: false, // Allows multiple triggers
		threshold: 0.1, // Trigger when 10% of the button is visible
	});

	// Load more when the "load more" button comes into view
	useEffect(() => {
		if (inView && hasMore && !isLoading) {
			loadMore();
		}
	}, [inView, hasMore, isLoading, loadMore]);

	return (
		<div ref={ref} className={css.loadMore}>
			{isLoading ? (
				<span className={css.buttonIcon}>
					<Spinner />
				</span>
			) : (
				<span>Loading more...</span>
			)}
		</div>
	);
};
