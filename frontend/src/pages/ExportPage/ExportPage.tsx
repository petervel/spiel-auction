import { Button, Stack } from '@mui/material';
import * as XLSX from 'xlsx';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { useListId } from '../../hooks/useListId';
import { Item } from '../../model/Item';

const ExportPage = () => {
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

	const buyingSheet = createSheetFromData(
		listId,
		buyingData.items as Item[],
		true
	);
	const sellingSheet = createSheetFromData(
		listId,
		(sellingData.items as Item[]).filter((item: Item) => item.hasBids),
		false
	);

	const excelFile = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(excelFile, buyingSheet, 'Buying');
	XLSX.utils.book_append_sheet(excelFile, sellingSheet, 'Selling');

	return (
		<Stack alignItems="center" my={5}>
			<div>
				<Button
					variant="contained"
					onClick={() => triggerDownload(excelFile)}
				>
					Export to XLSX
				</Button>
			</div>
		</Stack>
	);
};

const styleHeader = (sheet: XLSX.WorkSheet) => {
	const range = XLSX.utils.decode_range(sheet['!ref'] as string);

	for (let column = range.s.c; column <= range.e.c; ++column) {
		const cell_address = XLSX.utils.encode_cell({ r: 0, c: column });
		if (!sheet[cell_address]) continue;

		sheet[cell_address].s = {
			font: { bold: true }, // Make the text bold
			alignment: { horizontal: 'center' }, // Center align the text
		};
	}
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

const linkAuction = (listId: number, sheet: XLSX.WorkSheet, items: Item[]) => {
	items.forEach((item, index) => {
		sheet[`A${index + 2}`] = {
			v: item.objectName,
			l: {
				Target: `https://boardgamegeek.com/geeklist/${listId}?itemid=${item.id}`,
				Tooltip: 'View auction',
			},
		};
	});
};

const linkUserNames = (
	sheet: XLSX.WorkSheet,
	items: Item[],
	isBuying: boolean
) => {
	items.forEach((item, index) => {
		const username = getUsername(item, isBuying);
		sheet[`C${index + 2}`] = {
			v: username,
			l: {
				Target: `https://boardgamegeek.com/user/${username}`,
				Tooltip: 'View on BGG',
			},
		};
	});
};

const getUsername = (item: Item, isBuying: boolean) =>
	isBuying ? item.username : item.highestBidder;

const triggerDownload = (excelFile: XLSX.WorkBook) => {
	const wbOut = XLSX.write(excelFile, { bookType: 'xlsx', type: 'array' });

	const blob = new Blob([wbOut], { type: 'application/octet-stream' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'Spiel2024.xlsx';
	link.click();
};

const createStructure = (items: Item[], isBuying = true) =>
	items.map((item) => ({
		Name: item.objectName,
		Price: `€${item.currentBid}`,
		Username: getUsername(item, isBuying),
		Date: '',
		Time: '',
		Place: '',
		Notes: '',
	}));

const createSheetFromData = (
	listId: number,
	items: Item[],
	isBuying: boolean
): XLSX.WorkSheet => {
	const sortedItems = items.sort((a, b) =>
		compareStrings(getUsername(a, isBuying), getUsername(b, isBuying))
	);
	const structure = createStructure(sortedItems);
	const sheet = XLSX.utils.json_to_sheet(structure);

	styleHeader(sheet);
	linkAuction(listId, sheet, sortedItems);
	linkUserNames(sheet, sortedItems, isBuying);
	return sheet;
};

export default ExportPage;
