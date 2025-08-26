import { Button, Stack } from '@mui/material';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { useListId } from '../../hooks/useListId';
import { Item } from '../../model/Item';

export const ExportPage = () => {
	const bggUsername = useBggUsername();
	const listId = useListId();

	const {
		data: buyingData,
		error: buyingError,
		isLoading: buyingLoading,
	} = useBids({
		buyer: bggUsername,
	});
	const {
		data: sellingData,
		error: sellingError,
		isLoading: sellingLoading,
	} = useBids({
		seller: bggUsername,
	});

	if (buyingLoading || sellingLoading) return <Spinner />;

	if (buyingError || sellingError) {
		const typedError = (buyingError ?? sellingError) as Error;
		return <div>Error: {typedError.message}</div>;
	}

	const workbook = new ExcelJS.Workbook();
	createSheet(listId, workbook, buyingData.items, true);

	const filteredSales = (sellingData.items as Item[]).filter(
		(item: Item) => item.hasBids
	);
	createSheet(listId, workbook, filteredSales, false);

	return (
		<Stack alignItems="center" my={5}>
			<div>
				<Button
					variant="contained"
					onClick={() => triggerDownload(workbook)}
				>
					Export to XLSX
				</Button>
			</div>
		</Stack>
	);
};

const linkAuctions = (
	listId: number,
	sheet: ExcelJS.Worksheet,
	items: Item[]
) => {
	items.forEach((item, index) => {
		const row = sheet.getRow(index + 2);
		row.getCell('name').value = {
			text: item.objectName,
			hyperlink: `https://boardgamegeek.com/geeklist/${listId}?itemid=${item.id}`,
			tooltip: 'View auction',
		};
	});
};

const linkUserNames = (
	sheet: ExcelJS.Worksheet,
	items: Item[],
	isBuying: boolean
) => {
	items.forEach((item, index) => {
		const username = getUsername(item, isBuying) ?? '';
		const row = sheet.getRow(index + 2);
		row.getCell('username').value = {
			text: username,
			hyperlink: `https://boardgamegeek.com/user/${username}`,
			tooltip: 'View on BGG',
		};
	});
};

const getUsername = (item: Item, isBuying: boolean) =>
	isBuying ? item.username : item.highestBidder;

const triggerDownload = async (workbook: ExcelJS.Workbook) => {
	const buffer = await workbook.xlsx.writeBuffer();

	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const currentYear = new Date().getFullYear();

	saveAs(blob, `Spiel${currentYear}.xlsx`);
};

const createSheet = (
	listId: number,
	workbook: ExcelJS.Workbook,
	items: Item[],
	isBuying: boolean
) => {
	const sheet = workbook.addWorksheet(isBuying ? 'Buying' : 'Selling');
	sheet.columns = [
		{ header: '☑', key: 'done', width: 8 },
		{ header: 'Name', key: 'name', width: 30 },
		{ header: 'Price', key: 'price', width: 10 },
		{ header: 'Username', key: 'username', width: 20 },
		{ header: 'Date', key: 'date', width: 10 },
		{ header: 'Time', key: 'time', width: 10 },
		{ header: 'Place', key: 'place', width: 10 },
		{ header: 'Notes', key: 'notes', width: 50 },
	];

	const sortedItems = items.sort((a, b) =>
		compareStrings(getUsername(a, isBuying), getUsername(b, isBuying))
	);

	sheet.addRows(
		sortedItems.map((item) => ({
			done: '',
			name: item.objectName,
			price: item.currentBid,
			username: getUsername(item, isBuying),
			date: '',
			time: '',
			place: '',
			notes: '',
		}))
	);

	const headerRow = sheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { horizontal: 'center' };

	const priceColumn = sheet.getColumn('price');
	priceColumn.alignment = { horizontal: 'right' };
	priceColumn.numFmt = '€0';

	for (const id of ['username', 'date', 'time', 'place']) {
		sheet.getColumn(id).alignment = { horizontal: 'center' };
	}

	linkAuctions(listId, sheet, sortedItems);
	linkUserNames(sheet, sortedItems, isBuying);
};

const compareStrings = (a?: string, b?: string) => {
	if (!a || !b) {
		// This should never happen, and if it does it's fine to consider it even
		return 0;
	}

	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};
