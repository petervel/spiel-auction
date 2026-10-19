import { MeetupChanges, MeetupEntry } from '../../hooks/useMeetups';
import { CollapsibleSection } from './CollapsibleSection';
import { meetupKey } from './meetupDisplay';
import { MeetupRow, RenameInput } from './MeetupRow';
import css from './MeetupsPage.module.css';

// Shared by the main Meetups page and a single day's page - takes entries
// already sorted (sortByCompletedAtDesc) so the two never disagree on order.
export const CompletedSection = ({
	entries,
	onChangeFor,
	onRenameFor,
	onDeleteFor,
	highlightedKey,
	onHighlighted,
}: {
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
	onRenameFor: (entry: MeetupEntry) => (input: RenameInput) => Promise<unknown>;
	onDeleteFor: (entry: MeetupEntry) => () => Promise<unknown>;
	highlightedKey?: string | null;
	onHighlighted?: () => void;
}) => {
	if (entries.length === 0) return null;

	// This section defaults to collapsed - a just-added custom meetup that
	// landed on an already-completed entry would otherwise be invisible,
	// never mind highlighted.
	const forceOpen =
		highlightedKey != null &&
		entries.some((entry) => meetupKey(entry) === highlightedKey);

	return (
		<CollapsibleSection
			label={`Completed (${entries.length})`}
			forceOpen={forceOpen}
		>
			<div className={css.list}>
				{entries.map((entry) => (
					<MeetupRow
						key={meetupKey(entry)}
						entry={entry}
						onChange={onChangeFor(entry)}
						onRename={onRenameFor(entry)}
						onDelete={onDeleteFor(entry)}
						highlighted={meetupKey(entry) === highlightedKey}
						onHighlighted={onHighlighted}
					/>
				))}
			</div>
		</CollapsibleSection>
	);
};
