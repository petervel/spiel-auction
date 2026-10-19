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
	forceOpen = false,
	children,
}: {
	label: string;
	defaultOpen?: boolean;
	// Opens the section regardless of its current state, e.g. because it
	// now contains the entry a just-added custom meetup landed on - never
	// closes it back once that stops being true, so toggling it shut again
	// is always still the user's own call.
	forceOpen?: boolean;
	children: ReactNode;
}) => {
	const [open, setOpen] = useState(defaultOpen);

	// React's documented "adjust state during render" pattern (compare
	// against the previous prop value, not a useEffect) - this needs to
	// apply before the section's own first render with forceOpen true
	// paints, not one tick later.
	const [prevForceOpen, setPrevForceOpen] = useState(forceOpen);
	if (forceOpen !== prevForceOpen) {
		setPrevForceOpen(forceOpen);
		if (forceOpen) setOpen(true);
	}

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
