import { scaleLinear } from "d3-scale";
import { cumsum, sum } from "d3-array";
import type { InstallStepMetric } from "@control-plane-eck/shared";
import { formatSeconds } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";

const WIDTH = 640;
const BAR_HEIGHT = 32;
const GAP = 2;

export function InstallJourneyChart({
  steps,
  revealedCount,
  isSample,
}: {
  steps: InstallStepMetric[];
  revealedCount: number;
  isSample: boolean;
}) {
  const total = sum(steps, (d) => d.durationSeconds) || 1;
  const scale = scaleLinear().domain([0, total]).range([0, WIDTH]);
  // Unrevealed steps count as zero width until their scroll step arrives, so
  // every segment already exists in the DOM and CSS can transition its
  // width/x smoothly rather than popping in.
  const effective = steps.map((step, i) => (i < revealedCount ? step.durationSeconds : 0));
  const offsets = cumsum(effective);
  const revealed = steps.slice(0, revealedCount);

  return (
    <ChartFrame
      title="The install, second by second"
      sourceFile="site/data/install-metrics.json"
      provenance={isSample ? "sample" : "real"}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${BAR_HEIGHT}`}
        className="journey-svg"
        role="img"
        aria-label={`Install timeline, ${formatSeconds(sum(revealed, (d) => d.durationSeconds) || 0)} elapsed of ${steps.length} steps`}
      >
        <rect x={0} y={0} width={WIDTH} height={BAR_HEIGHT} rx={4} className="chart-track" />
        {/* Rounded only at the overall bar's two ends, per the stacked-bar
            convention: internal boundaries are plain gaps, not per-segment
            rounding. The clip also lets x/width transition smoothly in CSS
            as revealedCount grows, since these stay ordinary <rect>s. */}
        <clipPath id="journey-clip">
          <rect x={0} y={0} width={WIDTH} height={BAR_HEIGHT} rx={4} />
        </clipPath>
        <g clipPath="url(#journey-clip)">
          {steps.map((step, i) => {
            const value = effective[i] ?? 0;
            const offsetSeconds = i === 0 ? 0 : offsets[i - 1] ?? 0;
            const x = scale(offsetSeconds) + GAP / 2;
            const width = Math.max(scale(value) - GAP, 0);
            const colorVar = step.ok ? "--status-good" : "--status-critical";
            return (
              <rect
                key={step.name}
                x={x}
                y={0}
                width={width}
                height={BAR_HEIGHT}
                fill={`var(${colorVar})`}
                className="journey-segment"
              />
            );
          })}
        </g>
      </svg>
      <ol className="journey-step-list">
        {revealed.map((step) => (
          <li key={step.name} className={step.ok ? "journey-row" : "journey-row journey-row-error"}>
            <span aria-hidden="true" className="journey-icon">
              {step.ok ? "✓" : "✕"}
            </span>
            <span className="journey-label">{step.label}</span>
            <span className="journey-duration">{formatSeconds(step.durationSeconds)}</span>
            {!step.ok && step.error && <p className="journey-error">{step.error}</p>}
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
