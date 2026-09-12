import { ArrowBackRounded } from '@mui/icons-material';
import { IconButton, SxProps, Theme } from '@mui/material';
import { Link } from 'react-router-dom';

type BackButtonProps = {
	sx?: SxProps<Theme>;
};

// Standalone screens (Settings, Duplicates, Deleted, Export, Donate) have
// no persistent nav of their own - the only way back was clicking the
// logo, which isn't discoverable. This gives them an explicit way out.
//
// width/height are pinned to 58px - AuctionItemButton's actual rendered
// footprint (its 42px price badge plus 8px padding on each side) - so this
// button's box lines up exactly with the price column in the list below it,
// regardless of how much smaller this icon itself is than that badge.
export const BackButton = ({ sx }: BackButtonProps) => (
	<IconButton
		component={Link}
		to="/"
		aria-label="Back to home"
		sx={{ width: 58, height: 58, ...sx }}
	>
		<ArrowBackRounded />
	</IconButton>
);
