import { Container } from '../Container/Container';
import css from './NotReadyMessage.module.css';

export const NotReadyMessage = () => (
	<Container>
		<div className={css.notReady}>
			This year's auction list isn't ready yet. Check back soon!
		</div>
	</Container>
);
