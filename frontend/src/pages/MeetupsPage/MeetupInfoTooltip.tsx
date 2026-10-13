import { InfoOutlined } from '@mui/icons-material';
import { ClickAwayListener, IconButton, SxProps, Tooltip } from '@mui/material';
import { useState } from 'react';

// MUI's Tooltip only opens on hover, or a long-press on touch - a quick tap
// (the only gesture a phone actually has) does nothing, which reads as the
// icon being broken. Toggle it on click instead, with ClickAwayListener to
// close it again, so tap-to-show/tap-away-to-hide works the same on both.
export const MeetupInfoTooltip = ({
	label,
	sx,
}: {
	label: string;
	sx?: SxProps;
}) => {
	const [open, setOpen] = useState(false);

	return (
		<ClickAwayListener onClickAway={() => setOpen(false)}>
			<Tooltip
				title={label}
				open={open}
				onClose={() => setOpen(false)}
				disableFocusListener
				disableHoverListener
				disableTouchListener
			>
				<IconButton
					size="small"
					aria-label={label}
					onClick={() => setOpen((prev) => !prev)}
					sx={sx}
				>
					<InfoOutlined fontSize="small" />
				</IconButton>
			</Tooltip>
		</ClickAwayListener>
	);
};
