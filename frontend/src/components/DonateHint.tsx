import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const DonateHint = () => {
	const [visible, setVisible] = useState(false);

	const dismiss = () => {
		localStorage.setItem('donateHintDismissed', 'true');
		setVisible(false);
	};

	useEffect(() => {
		const dismissed = localStorage.getItem('donateHintDismissed');
		if (!dismissed) setVisible(true);
	}, []);

	if (!visible) return null;

	return (
		<Box
			sx={{
				mb: 2,
				width: '100%',
				maxWidth: 'var(--content-max-width)',
				margin: 'auto',
			}}
		>
			<Alert
				severity="info"
				sx={{ borderRadius: '10px' }}
				action={
					<IconButton
						aria-label="close"
						color="inherit"
						size="small"
						onClick={dismiss}
					>
						<CloseIcon fontSize="inherit" />
					</IconButton>
				}
			>
				Enjoying the app? Please consider{' '}
				<Link to="/donate" color="inherit" onClick={dismiss}>
					donating
				</Link>
				❤️
			</Alert>
		</Box>
	);
};
