import { Button } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import css from './AuctionItemButton.module.css';

interface Props {
	link?: string | (() => void);
	newTab?: boolean;
	tooltip?: string;
	className?: string;
	children: ReactNode;
}

const AuctionItemButton = ({
	link,
	newTab = false,
	tooltip,
	className,
	children,
}: Props) => {
	// <Tooltip title={tooltip} arrow enterDelay={1000} enterNextDelay={1000}>
	if (typeof link == 'string') {
		return (
			<Button
				component={RouterLink}
				to={link}
				target={newTab ? '_blank' : undefined}
				rel={newTab ? 'noreferrer' : undefined}
				className={classNames(className, css.button)}
				title={tooltip}
			>
				{children}
			</Button>
		);
	} else {
		return (
			<Button
				className={classNames(className, css.button)}
				onClick={link as () => void}
				rel="noreferrer"
				title={tooltip}
			>
				{children}
			</Button>
		);
	}
	// </Tooltip>
};

export default AuctionItemButton;
