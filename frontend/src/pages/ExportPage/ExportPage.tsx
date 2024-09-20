import { Button, Stack } from '@mui/material';
import * as XLSX from 'xlsx';
import { Spinner } from '../../components/Spinner/Spinner';
import { useBggUsername } from '../../hooks/useBggUsername';
import { useBids } from '../../hooks/useBids';
import { Item } from '../../model/Item';

const ExportPage = () => {
	const bggUsername = useBggUsername();

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

	const buying = createStructure2(buyingData.items);
	const selling = createStructure2(
		sellingData.items.filter((item: Item) => item.hasBids),
		false
	);

	const excelFile = XLSX.utils.book_new();
	const buyingSheet = XLSX.utils.json_to_sheet(buying);
	XLSX.utils.book_append_sheet(excelFile, buyingSheet, 'Buying');
	const sellingSheet = XLSX.utils.json_to_sheet(selling);
	XLSX.utils.book_append_sheet(excelFile, sellingSheet, 'Selling');

	return (
		<Stack alignItems="center" my={5}>
			<div>
				<Button
					variant="contained"
					onClick={() => exportExcel(excelFile)}
				>
					Export to XLSX
				</Button>
			</div>
		</Stack>
	);
};

const exportExcel = (excelFile: XLSX.WorkBook) => {
	const wbOut = XLSX.write(excelFile, { bookType: 'xlsx', type: 'array' });

	const blob = new Blob([wbOut], { type: 'application/octet-stream' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'lists.xlsx';
	link.click();
};

const createStructure2 = (items: Item[], isBuying = true) =>
	items.map((item) => ({
		Name: item.objectName,
		Price: item.currentBid,
		Username: isBuying ? item.username : item.highestBidder,
		Meeting: '',
		Notes: '',
	}));

export default ExportPage;
