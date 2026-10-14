import { Link } from 'react-router-dom';
import { MeetupSpotSummary } from '../../components/MeetupSpotSummary/MeetupSpotSummary';

// The same "your spot" summary Settings shows, at the top of the Meetups
// pages too - MeetupSpotSummary already covers "nothing set yet" on its
// own (the dashed "?" card), so this never needs its own empty state.
// Links straight to where it's edited, same as Settings' own edit icon.
export const MyMeetupSpotLink = ({
	square,
	description,
}: {
	square: string | null;
	description: string | null;
}) => (
	<Link
		to="/settings/location"
		style={{ textDecoration: 'none', color: 'inherit' }}
	>
		<MeetupSpotSummary square={square} description={description} />
	</Link>
);
