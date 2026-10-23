import type { ReactNode } from "react";

export interface ChartFrameProps {
  title: string;
  children: ReactNode;
  /** e.g. "site/data/install-metrics.json" */
  sourceFile: string;
  /** "real" measured data vs a seeded "sample" fixture, see site/data/README.md */
  provenance: "real" | "sample" | "mixed";
  legend?: ReactNode;
}

const PROVENANCE_LABEL: Record<ChartFrameProps["provenance"], string> = {
  real: "Real captured data",
  sample: "Sample data",
  mixed: "Real data, cross-referenced",
};

/**
 * Shared wrapper for every chart: the `viz-root` class carries the light/dark
 * CSS variable tokens (see globals.css), plus a visible, always-on caption
 * naming exactly which JSON file backs the chart and whether it is real or
 * sample data. No chart in this site renders without this provenance line.
 */
export function ChartFrame({ title, children, sourceFile, provenance, legend }: ChartFrameProps) {
  return (
    <div className="viz-root chart-frame">
      <div className="chart-frame-head">
        <h3>{title}</h3>
        {legend}
      </div>
      <div className="chart-frame-body">{children}</div>
      <p className={`chart-provenance chart-provenance-${provenance}`}>
        {PROVENANCE_LABEL[provenance]} &middot; <code>{sourceFile}</code>
      </p>
    </div>
  );
}
