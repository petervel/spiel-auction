import { ArrowBackRounded } from '@mui/icons-material';
import { IconButton, SxProps, Theme } from '@mui/material';
import { Link } from 'react-router-dom';

type BackButtonProps = {
	sx?: SxProps<Theme>;
};

// Standalone screens (Settings, Duplicates, Deleted, Export, Donate) have
// no persistent nav of their own - the only way back was clicking the
// logo, which isn't discoverable. This gives them an explicit way out.
export const BackButton = ({ sx }: BackButtonProps) => (
	<IconButton
		component={Link}
		to="/"
		aria-label="Back to home"
		size="small"
		sx={sx}
	>
		<ArrowBackRounded />
	</IconButton>
);
