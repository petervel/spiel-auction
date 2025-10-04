import { Button } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import css from './AuctionItemButton.module.css';
import { Link } from 'react-router-dom';

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
			<Link to={link} target={newTab ? '_blank' : '_self'} rel="noreferrer">
				<Button
					className={classNames(className, css.button)}
					title={tooltip}
				>
					{children}
				</Button>
			</Link>
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
