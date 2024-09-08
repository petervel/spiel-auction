import { Button } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
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
	console.log({ link }, typeof link == 'string');
	if (typeof link == 'string') {
		return (
			<Button
				className={classNames(className, css.button)}
				href={link as string}
				rel="noreferrer"
				target={newTab ? '_blank' : '_self'}
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
