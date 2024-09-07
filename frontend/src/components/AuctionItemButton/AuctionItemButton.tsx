import { Button, Tooltip } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import css from './AuctionItemButton.module.css';

interface Props {
	onClick?: () => void;
	href?: string;
	newTab?: boolean;
	tooltip?: string;
	className?: string;
	children: ReactNode;
}

const AuctionItemButton = ({
	onClick,
	href,
	newTab = false,
	tooltip,
	className,
	children,
}: Props) => {
	return (
		<Tooltip title={tooltip} arrow>
			<Button
				className={classNames(className, css.button)}
				href={href ?? '#'}
				onClick={onClick}
				rel="noreferrer"
				target={newTab ? '_blank' : '_self'}
			>
				{children}
			</Button>
		</Tooltip>
	);
};

export default AuctionItemButton;
