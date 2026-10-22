import classNames from 'classnames';
import css from './TradeFloorGrid.module.css';

// Row order top to bottom, left to right - row 8 at the top, row 1 nearest
// the entrance. Columns A-F run the full height; G/H sit beyond F but only
// exist for the middle rows - the room doesn't extend that far right at
// the very back (row 8) or the front two rows (1-2).
const MAIN_COLUMNS = ['A', 'B', 'C', 'D', 'E'];
const ROWS = [8, 7, 6, 5, 4, 3, 2, 1];
const EXT_COLUMNS = ['G', 'H'];
const EXT_ROWS = [7, 6, 5, 4, 3];

// The 9 "main block" pillars (A/C/E x rows 2/4/6), per the reference map,
// plus a 4th column of 2 more in G - rows 4/6 only, no pillar at G2.
const PILLAR_ROWS = [6, 4, 2];
const PILLAR_RADIUS = 14;

// Column widths (A-E) measured from the reference image - close to
// uniform but not exact. F is a new full-height column with no pillar of
// its own; G/H are what used to be the only extension columns, now
// shifted right of F.
const COLUMN_WIDTHS = [110, 116, 116, 117, 123];
const FULL_COLUMN_F_WIDTH = 140;
const EXT_COLUMN_WIDTHS: Record<string, number> = { G: 114, H: 117 };
const EXT_WIDTH = EXT_COLUMNS.reduce((sum, col) => sum + EXT_COLUMN_WIDTHS[col], 0);

const COLUMN_LEFTS = COLUMN_WIDTHS.reduce<number[]>((lefts, _width, i) => {
	lefts.push(i === 0 ? 0 : lefts[i - 1] + COLUMN_WIDTHS[i - 1]);
	return lefts;
}, []);
const MAIN_GRID_WIDTH = COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
// A-F, all full height - the block the entrance/outer-wall measurements
// below are relative to.
const FULL_HEIGHT_WIDTH = MAIN_GRID_WIDTH + FULL_COLUMN_F_WIDTH;

// Pillar A sits close to column A's own left edge (near the outer wall),
// not centered in the column like C/E are - measured as a fraction of
// MAIN_GRID_WIDTH (A-E only) since it isn't shared with another pillar's
// position the way C/E's column-center rule is.
const PILLAR_A_FRACTION = 0.0172;
// Column G's own left edge (= column F's right edge).
const PILLAR_G_OFFSET = 16;
const PILLAR_G_ROWS = [6, 4];

// Legend explaining the pillar circles, bottom-right of the map - clear of
// the entrance arrow/label, which sit further left under the entrance gap.
const LEGEND_MARGIN = 24;
const LEGEND_TEXT_GAP = 10;
const LEGEND_TEXT_RESERVED_WIDTH = 100;
const LEGEND_TOP_OFFSET = 50;

const GRID_LEFT = 120;
const GRID_TOP = 100;

// Row heights (top to bottom, row 8 to row 1) measured directly from the
// reference image - rows 7/8 are smaller, row 1 (nearest the entrance) is
// noticeably bigger, and the middle rows vary too rather than being
// perfectly uniform.
const ROW_HEIGHTS = [90, 94, 103, 120, 114, 109, 124, 136];
const ROW_TOPS = ROW_HEIGHTS.reduce<number[]>((tops, _height, i) => {
	tops.push(i === 0 ? 0 : tops[i - 1] + ROW_HEIGHTS[i - 1]);
	return tops;
}, []);
const GRID_HEIGHT = ROW_HEIGHTS.reduce((sum, height) => sum + height, 0);

const rowIndex = (row: number) => ROWS.indexOf(row);
const extRowIndices = EXT_ROWS.map(rowIndex);
// The vertical span G/H actually occupy - rows 3-7, not the full height.
const EXT_TOP = ROW_TOPS[Math.min(...extRowIndices)];
const EXT_BOTTOM =
	ROW_TOPS[Math.max(...extRowIndices)] + ROW_HEIGHTS[Math.max(...extRowIndices)];

// Every column this grid can draw, full-height (A-F) or extension-only
// (G/H) - shared by cells, headers, pillars and the outline below, so
// there's one source of truth for "which squares exist at all".
type ColumnLayout = {
	id: string;
	x: number;
	width: number;
	rows: number[];
	headerTop: number;
};
const COLUMNS: ColumnLayout[] = [
	...MAIN_COLUMNS.map((id, i) => ({
		id,
		x: COLUMN_LEFTS[i],
		width: COLUMN_WIDTHS[i],
		rows: ROWS,
		headerTop: 0,
	})),
	{ id: 'F', x: MAIN_GRID_WIDTH, width: FULL_COLUMN_F_WIDTH, rows: ROWS, headerTop: 0 },
	{
		id: 'G',
		x: FULL_HEIGHT_WIDTH,
		width: EXT_COLUMN_WIDTHS.G,
		rows: EXT_ROWS,
		headerTop: EXT_TOP,
	},
	{
		id: 'H',
		x: FULL_HEIGHT_WIDTH + EXT_COLUMN_WIDTHS.G,
		width: EXT_COLUMN_WIDTHS.H,
		rows: EXT_ROWS,
		headerTop: EXT_TOP,
	},
];
const GRID_WIDTH = FULL_HEIGHT_WIDTH + EXT_WIDTH;

const columnById = (id: string) => COLUMNS.find((col) => col.id === id);

// A square's on-screen rect, or null if that column/row combination
// doesn't exist (e.g. "G2" - G only exists for rows 3-7).
const squareRect = (square: string) => {
	const col = columnById(square[0]);
	const row = Number(square.slice(1));
	if (!col || !col.rows.includes(row)) return null;
	const j = rowIndex(row);
	return {
		x: GRID_LEFT + col.x,
		y: GRID_TOP + ROW_TOPS[j],
		width: col.width,
		height: ROW_HEIGHTS[j],
	};
};

// Entrance gap, anchored to the A/B boundary - fractions of
// MAIN_GRID_WIDTH (A-E only), independent of F/G/H beyond it.
const ENTRANCE_GAP_LEFT_FRACTION = 0.0902;
const ENTRANCE_GAP_RIGHT_FRACTION = 0.2053;
const ENTRANCE_GAP_LEFT = GRID_LEFT + ENTRANCE_GAP_LEFT_FRACTION * MAIN_GRID_WIDTH;
const ENTRANCE_GAP_RIGHT = GRID_LEFT + ENTRANCE_GAP_RIGHT_FRACTION * MAIN_GRID_WIDTH;

// The entrance: a single arrow (shaft + solid arrowhead) climbing into the
// entrance gap, crossed by tick marks that shrink toward the arrowhead -
// matching the reference map's own entrance symbol exactly (measured
// directly from hall1a-meetup-map.png: ~65 degrees from horizontal, 5
// perpendicular ticks evenly spaced along the shaft, each roughly 9px
// shorter than the last).
const ENTRANCE_ARROW_END = {
	x: (ENTRANCE_GAP_LEFT + ENTRANCE_GAP_RIGHT) / 2,
	y: GRID_TOP + GRID_HEIGHT,
};
const ENTRANCE_ARROW_ANGLE_DEG = 65;
const ENTRANCE_ARROW_LENGTH = 110;
const ENTRANCE_ARROW_DIR = {
	x: Math.cos((ENTRANCE_ARROW_ANGLE_DEG * Math.PI) / 180),
	y: -Math.sin((ENTRANCE_ARROW_ANGLE_DEG * Math.PI) / 180),
};
const ENTRANCE_ARROW_START = {
	x: ENTRANCE_ARROW_END.x - ENTRANCE_ARROW_LENGTH * ENTRANCE_ARROW_DIR.x,
	y: ENTRANCE_ARROW_END.y - ENTRANCE_ARROW_LENGTH * ENTRANCE_ARROW_DIR.y,
};

const ENTRANCE_TICK_COUNT = 5;
const ENTRANCE_TICK_MIN_HALF_LENGTH = 11;
const ENTRANCE_TICK_MAX_HALF_LENGTH = 30;

const entranceTicks = () => {
	const dx = ENTRANCE_ARROW_END.x - ENTRANCE_ARROW_START.x;
	const dy = ENTRANCE_ARROW_END.y - ENTRANCE_ARROW_START.y;
	const length = Math.hypot(dx, dy);
	const perpX = -dy / length;
	const perpY = dx / length;
	return Array.from({ length: ENTRANCE_TICK_COUNT }, (_, i) => {
		const t = i / (ENTRANCE_TICK_COUNT - 1);
		const midX = ENTRANCE_ARROW_START.x + t * dx;
		const midY = ENTRANCE_ARROW_START.y + t * dy;
		// Widens as it nears the grid (t=1), not away from it.
		const halfLen =
			ENTRANCE_TICK_MIN_HALF_LENGTH +
			t * (ENTRANCE_TICK_MAX_HALF_LENGTH - ENTRANCE_TICK_MIN_HALF_LENGTH);
		return {
			x1: midX - perpX * halfLen,
			y1: midY - perpY * halfLen,
			x2: midX + perpX * halfLen,
			y2: midY + perpY * halfLen,
		};
	});
};

// Glow scales with count on a sqrt curve rather than linearly, so it stays
// visually distinguishable across the full range instead of saturating by
// ~5 people - squares can get up to ~40 people. Radius is capped well
// under half a cell's shortest side (90px), so it never bleeds into a
// neighboring cell.
const GLOW_SATURATION_COUNT = 40;
const GLOW_MIN_RADIUS = 14;
const GLOW_MAX_RADIUS = 42;
const GLOW_MIN_OPACITY = 0.35;
const GLOW_MAX_OPACITY = 0.8;
const glowIntensity = (count: number) =>
	Math.sqrt(Math.min(count, GLOW_SATURATION_COUNT) / GLOW_SATURATION_COUNT);
const glowRadius = (count: number) =>
	GLOW_MIN_RADIUS + glowIntensity(count) * (GLOW_MAX_RADIUS - GLOW_MIN_RADIUS);
const glowOpacity = (count: number) =>
	GLOW_MIN_OPACITY +
	glowIntensity(count) * (GLOW_MAX_OPACITY - GLOW_MIN_OPACITY);

// A fixed-size solid badge, not an intensity heatmap - the readOnly (per-day
// meetups) map cares about "is there a count here at all, and what is it",
// not density across up to ~40 people like the interactive one does.
const MEETUP_BUBBLE_RADIUS = 30;

// A classic map-pin silhouette (Material Design's "place" glyph), in its
// own 24x24 space with the tip - what should land exactly on the target
// square - at (12, 22). Scaled/translated into position per use, same as
// the pillars' offset-based positioning above.
const MARKER_HEAD_PATH =
	'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';
const MARKER_HOLE_PATH =
	'M12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
const MARKER_TIP = { x: 12, y: 22 };
const MARKER_SCALE = 2.2;

type TradeFloorGridProps = {
	counts: Record<string, number>;
	selected: string | null;
	onSelect: (square: string) => void;
	// A square to point out with a pin, distinct from `selected` (your own
	// spot) - e.g. the result of looking up someone else's square. Purely
	// decorative, non-interactive.
	marker?: string | null;
	// Disables click/keyboard interaction and hover feedback entirely - for
	// a purely informational view (e.g. a per-day meetup summary) where
	// there's nothing to select.
	readOnly?: boolean;
	// What a square's count means in its aria-label - the interactive "set
	// your location" grid counts people; a read-only summary might count
	// something else (e.g. meetups).
	describeCount?: (count: number) => string;
	// readOnly only - colors a square's badge by role (buying: the app's
	// standard blue, selling: its standard green, both: a gradient between
	// them), instead of the plain neutral badge used when this is omitted.
	roleCounts?: Record<string, { buying: number; selling: number }>;
};

export const TradeFloorGrid = ({
	counts,
	selected,
	onSelect,
	marker,
	readOnly = false,
	describeCount = (count) => `${count} people here`,
	roleCounts,
}: TradeFloorGridProps) => {
	const viewBoxWidth = GRID_LEFT + GRID_WIDTH + 120;
	const viewBoxHeight = GRID_TOP + GRID_HEIGHT + 220;

	return (
		<svg
			className={css.grid}
			viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
			role="group"
			aria-label={
				readOnly
					? 'Trade floor grid'
					: 'Trade floor grid - click a square to set your meetup location'
			}
		>
			<defs>
				<filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="8" />
				</filter>
				{/* A square with both a buying and a selling meetup gets this
				    blue-to-green blend rather than one color winning out. */}
				<linearGradient
					id="meetup-bubble-gradient"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="100%"
				>
					<stop offset="0%" className={css.meetupBubbleBuyingStop} />
					<stop offset="100%" className={css.meetupBubbleSellingStop} />
				</linearGradient>
				<marker
					id="entrance-arrowhead"
					markerUnits="userSpaceOnUse"
					markerWidth="18"
					markerHeight="16"
					refX="11"
					refY="8"
					orient="auto"
				>
					<path d="M0,0 L18,8 L0,16 Z" className={css.entranceArrow} />
				</marker>
			</defs>

			{/* Column labels + tick lines - G/H sit lower, above their own
			    first row, since they don't share the main header row A-F do. */}
			{COLUMNS.map((col) => {
				const cx = GRID_LEFT + col.x + col.width / 2;
				const headerY = GRID_TOP + col.headerTop;
				return (
					<g key={col.id}>
						<line
							x1={cx}
							y1={headerY - 45}
							x2={cx}
							y2={headerY}
							className={css.tickLine}
						/>
						<rect
							x={cx - 22}
							y={headerY - 82}
							width={44}
							height={36}
							rx={10}
							className={css.headerChip}
						/>
						<text x={cx} y={headerY - 59} className={css.headerLabel}>
							{col.id}
						</text>
					</g>
				);
			})}

			{/* Row labels + tick lines, both sides - the right side lands just
			    past whichever column is actually rightmost for that row (F
			    for rows 1/2/8, H for rows 3-7). */}
			{ROWS.map((row) => {
				const j = rowIndex(row);
				const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
				const leftChipCx = 40;
				const hasExt = EXT_ROWS.includes(row);
				const rightEdge = GRID_LEFT + FULL_HEIGHT_WIDTH + (hasExt ? EXT_WIDTH : 0);
				const rightChipCx = rightEdge + 80;
				return (
					<g key={row}>
						<line
							x1={65}
							y1={cy}
							x2={GRID_LEFT}
							y2={cy}
							className={css.tickLine}
						/>
						<rect
							x={leftChipCx - 22}
							y={cy - 18}
							width={44}
							height={36}
							rx={10}
							className={css.headerChip}
						/>
						<text x={leftChipCx} y={cy + 6} className={css.headerLabel}>
							{row}
						</text>

						{/* Row 8's right-side chip would sit right where
						    column G's own header lands just below it (G's
						    header hangs above its first row, row 7, which
						    is directly under row 8) - skip it there rather
						    than let the two cross. */}
						{row !== 8 && (
							<>
								<line
									x1={rightEdge}
									y1={cy}
									x2={rightChipCx - 25}
									y2={cy}
									className={css.tickLine}
								/>
								<rect
									x={rightChipCx - 22}
									y={cy - 18}
									width={44}
									height={36}
									rx={10}
									className={css.headerChip}
								/>
								<text
									x={rightChipCx}
									y={cy + 6}
									className={css.headerLabel}
								>
									{row}
								</text>
							</>
						)}
					</g>
				);
			})}

			{/* Cells: background, click target, coordinate label */}
			{COLUMNS.flatMap((col) =>
				col.rows.map((row) => {
					const square = `${col.id}${row}`;
					const j = rowIndex(row);
					const x = GRID_LEFT + col.x;
					const y = GRID_TOP + ROW_TOPS[j];
					const isSelected = square === selected;
					return (
						<g key={square}>
							<rect
								x={x}
								y={y}
								width={col.width}
								height={ROW_HEIGHTS[j]}
								className={classNames(
									css.cell,
									readOnly && css.cellReadOnly,
								)}
								onClick={
									readOnly ? undefined : () => onSelect(square)
								}
								onKeyDown={
									readOnly
										? undefined
										: (evt) => {
												if (
													evt.key === 'Enter' ||
													evt.key === ' '
												) {
													evt.preventDefault();
													onSelect(square);
												}
											}
								}
								tabIndex={readOnly ? -1 : 0}
								role={readOnly ? undefined : 'button'}
								aria-pressed={readOnly ? undefined : isSelected}
								aria-label={`Square ${square}${
									counts[square]
										? `, ${describeCount(counts[square])}`
										: ''
								}`}
							/>
							<text x={x + 10} y={y + 28} className={css.cellLabel}>
								{square}
							</text>
						</g>
					);
				}),
			)}

			{/* Physical pillars - fixed, decorative, non-interactive. A/C/E
			    form the main 3x3 (rows 2/4/6); G adds a 4th column but only
			    at rows 4/6 - there's no pillar at G2. */}
			<g aria-hidden="true">
				{(['A', 'C', 'E'] as const).flatMap((col) =>
					PILLAR_ROWS.map((row) => {
						const j = rowIndex(row);
						const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
						// C and E sit at their own column's center - never a
						// separately measured fraction - so they always land
						// evenly spaced from A and G.
						const colLayout = columnById(col)!;
						const cx =
							col === 'A'
								? GRID_LEFT + PILLAR_A_FRACTION * MAIN_GRID_WIDTH
								: GRID_LEFT + colLayout.x + colLayout.width / 2;
						return (
							<circle
								key={`${col}${row}`}
								cx={cx}
								cy={cy}
								r={PILLAR_RADIUS}
								className={css.pillar}
							/>
						);
					}),
				)}
				{PILLAR_G_ROWS.map((row) => {
					const j = rowIndex(row);
					const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
					const cx = GRID_LEFT + FULL_HEIGHT_WIDTH + PILLAR_G_OFFSET;
					return (
						<circle
							key={`G${row}`}
							cx={cx}
							cy={cy}
							r={PILLAR_RADIUS}
							className={css.pillar}
						/>
					);
				})}
			</g>

			{/* Count per square, drawn on top of cells/pillars but
			    pointer-events: none so clicks still reach the cell rect
			    underneath. The interactive (pick-your-own-spot) grid shows
			    this as a density heatmap glow; the readOnly (per-day meetups)
			    grid shows a plain solid badge instead - there's no "which
			    square is quieter" question to answer there, just "is there
			    a meetup here, and how many". */}
			{COLUMNS.flatMap((col) =>
				col.rows.map((row) => {
					const square = `${col.id}${row}`;
					const count = counts[square] ?? 0;
					if (count === 0) return null;
					const j = rowIndex(row);
					const cx = GRID_LEFT + col.x + col.width / 2;
					const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
					if (readOnly) {
						const buyingCount = roleCounts?.[square]?.buying ?? 0;
						const sellingCount = roleCounts?.[square]?.selling ?? 0;
						const bothRoles = buyingCount > 0 && sellingCount > 0;
						return (
							<g key={square}>
								<circle
									cx={cx}
									cy={cy}
									r={MEETUP_BUBBLE_RADIUS}
									className={classNames(
										css.meetupBubble,
										!bothRoles &&
											(sellingCount > 0
												? css.meetupBubbleSelling
												: css.meetupBubbleBuying),
									)}
									fill={
										bothRoles
											? 'url(#meetup-bubble-gradient)'
											: undefined
									}
								/>
								<text
									x={cx}
									y={cy}
									className={css.meetupBubbleLabel}
								>
									{count}
								</text>
							</g>
						);
					}
					return (
						<g key={square}>
							<circle
								cx={cx}
								cy={cy}
								r={glowRadius(count)}
								fillOpacity={glowOpacity(count)}
								className={css.glow}
								filter="url(#glow-blur)"
							/>
							<text x={cx} y={cy} className={css.countLabel}>
								{count}
							</text>
						</g>
					);
				}),
			)}

			{/* Selected-square ring, drawn last so it's never hidden by a glow */}
			{selected &&
				(() => {
					const rect = squareRect(selected);
					if (!rect) return null;
					return (
						<rect
							x={rect.x + 4}
							y={rect.y + 4}
							width={rect.width - 8}
							height={rect.height - 8}
							className={css.selectedRing}
						/>
					);
				})()}

			{/* Lookup marker pin - drawn last of all, so it's never hidden
			    behind the selected ring or a glow. */}
			{marker &&
				(() => {
					const rect = squareRect(marker);
					if (!rect) return null;
					const cx = rect.x + rect.width / 2;
					const cy = rect.y + rect.height / 2;
					return (
						<g
							transform={`translate(${
								cx - MARKER_TIP.x * MARKER_SCALE
							}, ${
								cy - MARKER_TIP.y * MARKER_SCALE
							}) scale(${MARKER_SCALE})`}
							aria-hidden="true"
						>
							<path
								d={MARKER_HEAD_PATH}
								className={css.lookupMarkerHead}
							/>
							<path
								d={MARKER_HOLE_PATH}
								className={css.lookupMarkerHole}
							/>
						</g>
					);
				})()}

			{/* Outer grid border, thick, with a gap under column B for the
			    entrance and a bump out on the right (G/H) spanning only
			    the middle rows (EXT_ROWS). */}
			<g className={css.gridOutline}>
				<line
					x1={GRID_LEFT}
					y1={GRID_TOP}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y2={GRID_TOP}
				/>
				<line
					x1={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y1={GRID_TOP}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y2={GRID_TOP + EXT_TOP}
				/>
				<line
					x1={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y1={GRID_TOP + EXT_TOP}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH + EXT_WIDTH}
					y2={GRID_TOP + EXT_TOP}
				/>
				<line
					x1={GRID_LEFT + FULL_HEIGHT_WIDTH + EXT_WIDTH}
					y1={GRID_TOP + EXT_TOP}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH + EXT_WIDTH}
					y2={GRID_TOP + EXT_BOTTOM}
				/>
				<line
					x1={GRID_LEFT + FULL_HEIGHT_WIDTH + EXT_WIDTH}
					y1={GRID_TOP + EXT_BOTTOM}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y2={GRID_TOP + EXT_BOTTOM}
				/>
				<line
					x1={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y1={GRID_TOP + EXT_BOTTOM}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y2={GRID_TOP + GRID_HEIGHT}
				/>
				<line
					x1={GRID_LEFT}
					y1={GRID_TOP}
					x2={GRID_LEFT}
					y2={GRID_TOP + GRID_HEIGHT}
				/>
				<line
					x1={GRID_LEFT}
					y1={GRID_TOP + GRID_HEIGHT}
					x2={ENTRANCE_GAP_LEFT}
					y2={GRID_TOP + GRID_HEIGHT}
				/>
				<line
					x1={ENTRANCE_GAP_RIGHT}
					y1={GRID_TOP + GRID_HEIGHT}
					x2={GRID_LEFT + FULL_HEIGHT_WIDTH}
					y2={GRID_TOP + GRID_HEIGHT}
				/>
			</g>

			{/* Entrance: an arrow climbing into the gap, crossed by tick marks
			    that shrink toward the arrowhead - matches the reference map */}
			<g className={css.entrance}>
				{entranceTicks().map((tick, i) => (
					<line
						key={i}
						x1={tick.x1}
						y1={tick.y1}
						x2={tick.x2}
						y2={tick.y2}
						className={css.entranceStairsRung}
					/>
				))}
				<line
					x1={ENTRANCE_ARROW_START.x}
					y1={ENTRANCE_ARROW_START.y}
					x2={ENTRANCE_ARROW_END.x}
					y2={ENTRANCE_ARROW_END.y}
					className={css.entranceArrow}
					markerEnd="url(#entrance-arrowhead)"
				/>
				<text
					x={ENTRANCE_ARROW_START.x}
					y={ENTRANCE_ARROW_START.y + 45}
					className={css.entranceLabel}
				>
					ENTRANCE
				</text>
			</g>

			{/* Legend: explains what the pillar circles are. Text sits to the
			    right of the circle (reading order "⬤ = pillar"), so the
			    circle is inset far enough from the right edge to leave room
			    for it - LEGEND_TEXT_RESERVED_WIDTH is a generous estimate for
			    "= pillar" at .legendLabel's font size. Sits just below the
			    grid rather than down at the bottom of the viewBox - the
			    entrance arrow needs that extra room, the legend doesn't. */}
			<g>
				<circle
					cx={
						viewBoxWidth -
						LEGEND_MARGIN -
						LEGEND_TEXT_RESERVED_WIDTH -
						LEGEND_TEXT_GAP -
						PILLAR_RADIUS
					}
					cy={GRID_TOP + GRID_HEIGHT + LEGEND_TOP_OFFSET}
					r={PILLAR_RADIUS}
					className={css.pillar}
				/>
				<text
					x={
						viewBoxWidth -
						LEGEND_MARGIN -
						LEGEND_TEXT_RESERVED_WIDTH
					}
					y={GRID_TOP + GRID_HEIGHT + LEGEND_TOP_OFFSET}
					className={css.legendLabel}
				>
					= pillar
				</text>
			</g>
		</svg>
	);
};
