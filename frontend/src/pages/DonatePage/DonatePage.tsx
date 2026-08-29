import FavoriteIcon from '@mui/icons-material/Favorite';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { BackButton } from '../../components/BackButton/BackButton';
import styles from './DonatePage.module.css';

export const DonatePage = () => {
	return (
		<>
			<BackButton />
			<div className={styles.container}>
				<Paper className={styles.paper} elevation={3}>
					<VolunteerActivismIcon
						color="primary"
						className={styles.icon}
					/>

					<Typography variant="h4" gutterBottom>
						Help keep the server running
					</Typography>

					<Typography variant="body1" className={styles.text}>
						I built this to make tracking Essen auctions easier. It
						started small, with just a handful of people using it,
						and has grown a lot since then! Hosting, the database,
						and the domain still cost a bit every month, so if it's
						been useful to you, even a small donation helps keep it
						running.
					</Typography>

					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={2}
						justifyContent="center"
						className={styles.stack}
					>
						<Button
							component="a"
							href="https://tikkie.me/pay/122js27811cio9gtmqdt"
							target="_blank"
							rel="noopener noreferrer"
							variant="contained"
							color="primary"
							startIcon={<FavoriteIcon />}
							className={styles.button}
							aria-label="Donate via Tikkie"
							data-donation-method="tikkie"
						>
							Donate via Tikkie
						</Button>

						<Button
							component="a"
							href="https://www.paypal.com/donate/?hosted_button_id=HVYVSGYNRGT4N"
							target="_blank"
							rel="noopener noreferrer"
							variant="outlined"
							color="secondary"
							className={styles.button}
							aria-label="Donate via PayPal"
							data-donation-method="paypal"
						>
							Donate via PayPal
						</Button>
					</Stack>

					<Typography variant="body2" className={styles.footer}>
						Thanks for using it, and for the support! ❤️
					</Typography>
				</Paper>
			</div>
		</>
	);
};
