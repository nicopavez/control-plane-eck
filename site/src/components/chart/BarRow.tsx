import type { ScaleLinear } from "d3-scale";
import { horizontalBarPath } from "./barPath";

const ROW_WIDTH = 320;
const LABEL_MARGIN = 72;
const BAR_HEIGHT = 18;
const GAP = 2;

export function SingleBarRow({
  value,
  scale,
  colorVar,
  valueLabel,
  ariaLabel,
}: {
  value: number;
  scale: ScaleLinear<number, number>;
  colorVar: string;
  valueLabel: string;
  ariaLabel: string;
}) {
  const width = Math.max(scale(value), 0);
  return (
    <svg
      viewBox={`0 0 ${ROW_WIDTH + LABEL_MARGIN} ${BAR_HEIGHT}`}
      className="bar-row-svg"
      role="img"
      aria-label={ariaLabel}
    >
      <rect x={0} y={0} width={ROW_WIDTH} height={BAR_HEIGHT} rx={4} className="chart-track" />
      {width > 0 && <path d={horizontalBarPath(0, 0, width, BAR_HEIGHT, 4)} fill={`var(${colorVar})`} />}
      <text x={Math.min(width + 8, ROW_WIDTH + LABEL_MARGIN - 4)} y={BAR_HEIGHT / 2} dy="0.32em" className="bar-value-label">
        {valueLabel}
      </text>
    </svg>
  );
}

export function DualBarRow({
  valueA,
  valueB,
  scale,
  colorVarA,
  colorVarB,
  labelA,
  labelB,
  ariaLabel,
}: {
  valueA: number;
  valueB: number;
  scale: ScaleLinear<number, number>;
  colorVarA: string;
  colorVarB: string;
  labelA: string;
  labelB: string;
  ariaLabel: string;
}) {
  const widthA = Math.max(scale(valueA), 0);
  const widthB = Math.max(scale(valueB), 0);
  const rowHeight = BAR_HEIGHT * 2 + GAP;
  return (
    <svg
      viewBox={`0 0 ${ROW_WIDTH + LABEL_MARGIN} ${rowHeight}`}
      className="bar-row-svg"
      role="img"
      aria-label={ariaLabel}
    >
      <rect x={0} y={0} width={ROW_WIDTH} height={BAR_HEIGHT} rx={4} className="chart-track" />
      <rect x={0} y={BAR_HEIGHT + GAP} width={ROW_WIDTH} height={BAR_HEIGHT} rx={4} className="chart-track" />
      {widthA > 0 && <path d={horizontalBarPath(0, 0, widthA, BAR_HEIGHT, 4)} fill={`var(${colorVarA})`} />}
      {widthB > 0 && (
        <path d={horizontalBarPath(0, BAR_HEIGHT + GAP, widthB, BAR_HEIGHT, 4)} fill={`var(${colorVarB})`} />
      )}
      <text
        x={Math.min(widthA + 8, ROW_WIDTH + LABEL_MARGIN - 4)}
        y={BAR_HEIGHT / 2}
        dy="0.32em"
        className="bar-value-label"
      >
        {labelA}
      </text>
      <text
        x={Math.min(widthB + 8, ROW_WIDTH + LABEL_MARGIN - 4)}
        y={BAR_HEIGHT + GAP + BAR_HEIGHT / 2}
        dy="0.32em"
        className="bar-value-label"
      >
        {labelB}
      </text>
    </svg>
  );
}
