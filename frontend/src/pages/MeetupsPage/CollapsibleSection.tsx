import { ExpandMoreRounded } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { ReactNode, useState } from 'react';
import css from './MeetupsPage.module.css';

// The chevron-toggle shell shared by every collapsible block on the
// Meetups page (Completed, Unfinished) - just the open/closed chrome,
// content is whatever the caller renders.
export const CollapsibleSection = ({
	label,
	defaultOpen = false,
	children,
}: {
	label: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) => {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<Stack gap={1}>
			<button
				type="button"
				className={css.completedHeader}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
			>
				<ExpandMoreRounded
					fontSize="small"
					className={classNames(css.chevron, open && css.chevronOpen)}
				/>
				<Typography variant="h6">{label}</Typography>
			</button>
			{open && children}
		</Stack>
	);
};
