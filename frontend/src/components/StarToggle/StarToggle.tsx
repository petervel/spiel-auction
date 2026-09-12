import { StarBorderRounded, StarRounded } from '@mui/icons-material';
import { IconButton } from '@mui/material';

type StarToggleProps = {
	checked: boolean;
	onToggle: () => void;
	disabled?: boolean;
	label?: string;
};

export const StarToggle = ({
	checked,
	onToggle,
	disabled = false,
	label = 'Toggle wishlist',
}: StarToggleProps) => {
	const clickWrapper = (evt: React.MouseEvent) => {
		evt.preventDefault();
		evt.stopPropagation();
		onToggle();
	};

	return (
		<IconButton
			onClick={clickWrapper}
			disabled={disabled}
			aria-label={label}
			aria-pressed={checked}
			color="warning"
		>
			{checked ? <StarRounded /> : <StarBorderRounded />}
		</IconButton>
	);
};
