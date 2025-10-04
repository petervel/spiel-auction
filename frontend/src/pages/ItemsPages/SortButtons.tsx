import { Stack } from "@mui/material";
import classNames from "classnames";
import { SORTING } from "../../util";
import css from "./SortButtons.module.css"
import { Timer, SortByAlpha, Euro } from "@mui/icons-material";

// Separate SortButtons component for clarity
type SortButtonsProps = {
	sorting: SORTING;
	setSorting: (value: SORTING) => void;
};

export const SortButtons = ({ sorting, setSorting }: SortButtonsProps) => (
	<Stack direction="row" justifyContent="center" my={2}>
		<Stack direction="row" justifyContent="space-around" gap={5}>
			{SORT_BUTTONS.map((button) => (
				<div
					key={button.setting}
					className={classNames(css.button, {
						[css.active]: button.setting === sorting,
					})}
					onClick={() => setSorting(button.setting)}
				>
					{button.icon}
				</div>
			))}
		</Stack>
	</Stack>
);

const SORT_BUTTONS = [
	{ setting: SORTING.END_DATE, icon: <Timer /> },
	{ setting: SORTING.NAME, icon: <SortByAlpha /> },
	{ setting: SORTING.PRICE, icon: <Euro /> },
];