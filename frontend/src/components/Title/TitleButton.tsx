import { Button } from '@mui/material';
import { ReactNode } from 'react';
import css from './TitleButton.module.css';

type SortToggleProps = {
	onClick: () => void;
	children: ReactNode;
	disabled?: boolean;
	'aria-label'?: string;
	'aria-pressed'?: boolean;
};
export const TitleButton = ({
	onClick,
	children,
	disabled,
	...ariaProps
}: SortToggleProps) => {
	const clickWrapper = (evt: React.MouseEvent) => {
		evt.stopPropagation();
		onClick();
	};

	return (
		<Button
			className={css.button}
			onClick={clickWrapper}
			disabled={disabled}
			// Matches AuctionItemButton's actual rendered footprint (42px price
			// badge + 8px padding each side) - via sx rather than the CSS
			// module, since sx reliably overrides MUI's own defaults without
			// needing !important.
			sx={{ width: 58, height: 58, minWidth: 58, padding: 0 }}
			{...ariaProps}
		>
			{children}
		</Button>
	);
};
