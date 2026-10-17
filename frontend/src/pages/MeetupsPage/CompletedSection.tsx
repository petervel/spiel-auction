import { MeetupChanges, MeetupEntry } from '../../hooks/useMeetups';
import { CollapsibleSection } from './CollapsibleSection';
import { MeetupRow, RenameInput } from './MeetupRow';
import css from './MeetupsPage.module.css';

// Shared by the main Meetups page and a single day's page - takes entries
// already sorted (sortByCompletedAtDesc) so the two never disagree on order.
export const CompletedSection = ({
	entries,
	onChangeFor,
	onRenameFor,
	onDeleteFor,
}: {
	entries: MeetupEntry[];
	onChangeFor: (entry: MeetupEntry) => (changes: MeetupChanges) => void;
	onRenameFor: (entry: MeetupEntry) => (input: RenameInput) => Promise<unknown>;
	onDeleteFor: (entry: MeetupEntry) => () => Promise<unknown>;
}) => {
	if (entries.length === 0) return null;

	return (
		<CollapsibleSection label={`Completed (${entries.length})`}>
			<div className={css.list}>
				{entries.map((entry) => (
					<MeetupRow
						key={`${entry.role}-${entry.counterpart}`}
						entry={entry}
						onChange={onChangeFor(entry)}
						onRename={onRenameFor(entry)}
						onDelete={onDeleteFor(entry)}
					/>
				))}
			</div>
		</CollapsibleSection>
	);
};
