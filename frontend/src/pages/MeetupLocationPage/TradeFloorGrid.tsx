import classNames from 'classnames';
import css from './TradeFloorGrid.module.css';

const COLUMNS = ['A', 'B', 'C', 'D', 'E'];
// Top to bottom, matching the reference layout - row 8 at the top, row 1
// nearest the entrance.
const ROWS = [8, 7, 6, 5, 4, 3, 2, 1];

// The 9 physical pillars in the trade floor, per the reference map - a
// fixed 3x3 pattern on columns A/C/E and rows 2/4/6.
const PILLAR_COLUMNS = ['A', 'C', 'E'];
const PILLAR_ROWS = [6, 4, 2];
const PILLARS = PILLAR_ROWS.flatMap((row) =>
	PILLAR_COLUMNS.map((col) => `${col}${row}`)
);
// Pillars are fixed structural columns, evenly spaced in the real room
// (measured ~228.7px apart in the reference image, independent of the
// coordinate grid's own column widths) - so their x position is placed as
// a fraction of the grid's total width rather than centered in a cell.
// Measured directly from the reference image (hall1a-meetup-map.png).
const PILLAR_X_FRACTION: Record<string, number> = {
	A: 0.1109,
	C: 0.4821,
	E: 0.8534,
};
const PILLAR_RADIUS = 14;

// Legend explaining the pillar circles, bottom-right of the map - clear of
// the entrance arrow/label, which sit further left under the entrance gap.
const LEGEND_MARGIN = 24;
const LEGEND_TEXT_GAP = 10;
const LEGEND_TEXT_RESERVED_WIDTH = 100;
const LEGEND_TOP_OFFSET = 50;

const GRID_LEFT = 120;
const GRID_TOP = 100;

// Column widths measured directly from the reference image - close to
// uniform but not exact (121/124/124/124/123px).
const COLUMN_WIDTHS = [121, 124, 124, 124, 123];
const COLUMN_LEFTS = COLUMN_WIDTHS.reduce<number[]>((lefts, _width, i) => {
	lefts.push(i === 0 ? 0 : lefts[i - 1] + COLUMN_WIDTHS[i - 1]);
	return lefts;
}, []);
const GRID_WIDTH = COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);

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

// The entrance gap sits under column B, but is narrower than the full
// column - measured as a fraction of grid width from the reference image
// rather than assumed to span the whole column.
const ENTRANCE_GAP_LEFT_FRACTION = 0.2159;
const ENTRANCE_GAP_RIGHT_FRACTION = 0.3571;
const ENTRANCE_GAP_LEFT = GRID_LEFT + ENTRANCE_GAP_LEFT_FRACTION * GRID_WIDTH;
const ENTRANCE_GAP_RIGHT =
	GRID_LEFT + ENTRANCE_GAP_RIGHT_FRACTION * GRID_WIDTH;

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
// the pillars' PILLAR_X_FRACTION approach above.
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

			{/* Column labels + tick lines */}
			{COLUMNS.map((col, i) => {
				const cx = GRID_LEFT + COLUMN_LEFTS[i] + COLUMN_WIDTHS[i] / 2;
				return (
					<g key={col}>
						<line
							x1={cx}
							y1={55}
							x2={cx}
							y2={GRID_TOP}
							className={css.tickLine}
						/>
						<rect
							x={cx - 22}
							y={18}
							width={44}
							height={36}
							rx={10}
							className={css.headerChip}
						/>
						<text x={cx} y={41} className={css.headerLabel}>
							{col}
						</text>
					</g>
				);
			})}

			{/* Row labels + tick lines, both sides */}
			{ROWS.map((row, j) => {
				const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
				const leftChipCx = 40;
				const rightChipCx = GRID_LEFT + GRID_WIDTH + 80;
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

						<line
							x1={GRID_LEFT + GRID_WIDTH}
							y1={cy}
							x2={GRID_LEFT + GRID_WIDTH + 55}
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
						<text x={rightChipCx} y={cy + 6} className={css.headerLabel}>
							{row}
						</text>
					</g>
				);
			})}

			{/* Cells: background, click target, coordinate label */}
			{ROWS.map((row, j) =>
				COLUMNS.map((col, i) => {
					const square = `${col}${row}`;
					const x = GRID_LEFT + COLUMN_LEFTS[i];
					const y = GRID_TOP + ROW_TOPS[j];
					const isSelected = square === selected;
					return (
						<g key={square}>
							<rect
								x={x}
								y={y}
								width={COLUMN_WIDTHS[i]}
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
				})
			)}

			{/* Physical pillars - fixed, decorative, non-interactive */}
			<g aria-hidden="true">
				{PILLARS.map((square) => {
					const col = square[0];
					const row = Number(square.slice(1));
					const j = ROWS.indexOf(row);
					const cx = GRID_LEFT + PILLAR_X_FRACTION[col] * GRID_WIDTH;
					const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
					return (
						<circle
							key={square}
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
			{ROWS.map((row, j) =>
				COLUMNS.map((col, i) => {
					const square = `${col}${row}`;
					const count = counts[square] ?? 0;
					if (count === 0) return null;
					const cx = GRID_LEFT + COLUMN_LEFTS[i] + COLUMN_WIDTHS[i] / 2;
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
				})
			)}

			{/* Selected-square ring, drawn last so it's never hidden by a glow */}
			{selected &&
				(() => {
					const i = COLUMNS.indexOf(selected[0]);
					const j = ROWS.indexOf(Number(selected.slice(1)));
					if (i === -1 || j === -1) return null;
					return (
						<rect
							x={GRID_LEFT + COLUMN_LEFTS[i] + 4}
							y={GRID_TOP + ROW_TOPS[j] + 4}
							width={COLUMN_WIDTHS[i] - 8}
							height={ROW_HEIGHTS[j] - 8}
							className={css.selectedRing}
						/>
					);
				})()}

			{/* Lookup marker pin - drawn last of all, so it's never hidden
			    behind the selected ring or a glow. */}
			{marker &&
				(() => {
					const i = COLUMNS.indexOf(marker[0]);
					const j = ROWS.indexOf(Number(marker.slice(1)));
					if (i === -1 || j === -1) return null;
					const cx = GRID_LEFT + COLUMN_LEFTS[i] + COLUMN_WIDTHS[i] / 2;
					const cy = GRID_TOP + ROW_TOPS[j] + ROW_HEIGHTS[j] / 2;
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
			    entrance. */}
			<g className={css.gridOutline}>
				<line
					x1={GRID_LEFT}
					y1={GRID_TOP}
					x2={GRID_LEFT + GRID_WIDTH}
					y2={GRID_TOP}
				/>
				<line
					x1={GRID_LEFT}
					y1={GRID_TOP}
					x2={GRID_LEFT}
					y2={GRID_TOP + GRID_HEIGHT}
				/>
				<line
					x1={GRID_LEFT + GRID_WIDTH}
					y1={GRID_TOP}
					x2={GRID_LEFT + GRID_WIDTH}
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
					x2={GRID_LEFT + GRID_WIDTH}
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
