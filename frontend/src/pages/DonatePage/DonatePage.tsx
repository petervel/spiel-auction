import FavoriteIcon from '@mui/icons-material/Favorite';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { Button, Paper, Stack, Typography } from '@mui/material';
import styles from './DonatePage.module.css';

export const DonatePage = () => {
	return (
		<div className={styles.container}>
			<Paper className={styles.paper} elevation={3}>
				<VolunteerActivismIcon
					color="primary"
					className={styles.icon}
				/>

				<Typography variant="h4" gutterBottom>
					Help Keep the Server Running 💖
				</Typography>

				<Typography variant="body1" className={styles.text}>
					This app costs a bit to host and maintain — things like the
					server, database access, and domain fees add up over time.
					If you enjoy using it and would like to chip in, any small
					donation helps a lot and is greatly appreciated!
				</Typography>

				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					justifyContent="center"
					className={styles.stack}
				>
					<Button
						component="a"
						href="https://tikkie.me/pay/qv9f9cbcmflv5159qfe6"
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
					Thank you so much for your support — it really means a lot!
					❤️
				</Typography>
			</Paper>
		</div>
	);
};
