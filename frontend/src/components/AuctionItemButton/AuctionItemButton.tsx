import { ReactNode } from 'react';
import css from './AuctionItemButton.module.css';
import { Button, Tooltip } from '@mui/material';

interface Props {
	href?: string;
	newTab?: boolean;
	tooltip?: string;
	children: ReactNode;
}

const AuctionItemButton = ({
	href,
	newTab = false,
	tooltip,
	children,
}: Props) => {
	return (
		<Tooltip title={tooltip} arrow>
			<Button
				className={css.button}
				href={href ?? '#'}
				rel="noreferrer"
				target={newTab ? '_blank' : '_self'}
			>
				{children}
			</Button>
		</Tooltip>
	);
};

export default AuctionItemButton;
