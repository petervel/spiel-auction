import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { MeetupDay, MeetupEntry, MeetupRole } from '../../hooks/useMeetups';
import { DAY_LABELS, DAY_ORDER, HALL_1A } from './meetupDisplay';

// Unscheduled (-1) first, then in day order - matches groupByDay's section
// order on the page itself.
const dayIndex = (day: MeetupDay | null) => (day ? DAY_ORDER.indexOf(day) : -1);

// Unlike the page's own getDisplayTime (which hides the default 15:00
// until it's actually been changed), the printed sheet should always show
// a time once a day is picked - there's no live "still editing" state to
// wait on here, so "15:00" is as good an answer as any other.
const exportTime = (entry: MeetupEntry) =>
	entry.meetup.day ? entry.meetup.time : '';

// Combines what used to be two separate columns (the counterpart's own
// floor square, and this specific meetup's agreed place): a custom place
// wins outright, otherwise it's "Hall 1A" plus their coordinate if they've
// set one.
const exportWhere = (entry: MeetupEntry) => {
	if (entry.meetup.location !== HALL_1A) return entry.meetup.location;
	const square = entry.counterpartLocation?.square;
	return square ? `${HALL_1A}: ${square}` : HALL_1A;
};

// One row per item (same granularity the export has always had).
type ExportRow = {
	itemId: number;
	name: string;
	price?: number;
	username: string;
	where: string;
	description: string | null;
	day: MeetupDay | null;
	time: string;
	// The real underlying time, kept separate from the display `time`
	// (which blanks out when there's no day) so sorting stays correct even
	// for rows that don't show a time at all.
	sortTime: string;
	notes: string | null;
};

const flattenEntries = (
	entries: MeetupEntry[],
	role: MeetupRole,
): ExportRow[] =>
	entries
		.filter((entry) => entry.role === role)
		.flatMap((entry) =>
			entry.items.map((item) => ({
				itemId: item.id,
				name: item.objectName,
				price: item.currentBid,
				username: entry.counterpart,
				where: exportWhere(entry),
				description: entry.counterpartLocation?.description ?? null,
				day: entry.meetup.day,
				time: exportTime(entry),
				sortTime: entry.meetup.time,
				notes: entry.meetup.myNotes,
			})),
		);

const compareStrings = (a?: string, b?: string) => {
	if (!a || !b) {
		// This should never happen, and if it does it's fine to consider it even
		return 0;
	}
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};

// Same ordering as the page itself (groupByDay + byTimeThenCounterpart):
// unscheduled/day first, then time, then the other party's name.
const compareRows = (a: ExportRow, b: ExportRow) => {
	const dayDiff = dayIndex(a.day) - dayIndex(b.day);
	if (dayDiff !== 0) return dayDiff;
	if (a.sortTime !== b.sortTime) {
		return compareStrings(a.sortTime, b.sortTime);
	}
	return compareStrings(a.username, b.username);
};

const linkAuctions = (
	listId: number,
	sheet: ExcelJS.Worksheet,
	rows: ExportRow[],
) => {
	rows.forEach((row, index) => {
		const sheetRow = sheet.getRow(index + 2);
		sheetRow.getCell('name').value = {
			text: row.name,
			hyperlink: `https://boardgamegeek.com/geeklist/${listId}?itemid=${row.itemId}`,
			tooltip: 'View auction',
		};
	});
};

const linkUserNames = (sheet: ExcelJS.Worksheet, rows: ExportRow[]) => {
	rows.forEach((row, index) => {
		const sheetRow = sheet.getRow(index + 2);
		sheetRow.getCell('username').value = {
			text: row.username,
			hyperlink: `https://boardgamegeek.com/user/${row.username}`,
			tooltip: 'View on BGG',
		};
	});
};

const createSheet = (
	listId: number,
	workbook: ExcelJS.Workbook,
	sheetName: string,
	rows: ExportRow[],
) => {
	const sheet = workbook.addWorksheet(sheetName);
	sheet.columns = [
		{ header: '☑', key: 'done', width: 8 },
		{ header: 'Name', key: 'name', width: 30 },
		{ header: 'Price', key: 'price', width: 10 },
		{ header: 'Username', key: 'username', width: 20 },
		{ header: 'Where', key: 'where', width: 20 },
		{ header: 'Info', key: 'info', width: 30 },
		{ header: 'Date', key: 'date', width: 10 },
		{ header: 'Time', key: 'time', width: 10 },
		{ header: 'Notes', key: 'notes', width: 50 },
	];

	const sortedRows = [...rows].sort(compareRows);

	sheet.addRows(
		sortedRows.map((row) => ({
			done: '',
			name: row.name,
			price: row.price,
			username: row.username,
			where: row.where,
			info: row.description ?? '',
			date: row.day ? DAY_LABELS[row.day] : '',
			time: row.time,
			notes: row.notes ?? '',
		})),
	);

	const headerRow = sheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { horizontal: 'center' };

	const priceColumn = sheet.getColumn('price');
	priceColumn.alignment = { horizontal: 'right' };
	priceColumn.numFmt = '€0';

	for (const id of ['username', 'where', 'date', 'time']) {
		sheet.getColumn(id).alignment = { horizontal: 'center' };
	}

	linkAuctions(listId, sheet, sortedRows);
	linkUserNames(sheet, sortedRows);
};

export const exportMeetupsToXlsx = async (
	entries: MeetupEntry[],
	listId: number,
) => {
	const workbook = new ExcelJS.Workbook();
	createSheet(listId, workbook, 'Buying', flattenEntries(entries, 'buying'));
	createSheet(
		listId,
		workbook,
		'Selling',
		flattenEntries(entries, 'selling'),
	);

	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const currentYear = new Date().getFullYear();

	saveAs(blob, `Spiel${currentYear}.xlsx`);
};
