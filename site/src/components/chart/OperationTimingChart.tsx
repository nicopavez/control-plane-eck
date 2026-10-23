import { scaleLinear } from "d3-scale";
import { max } from "d3-array";
import { operationTiming } from "@/lib/data";
import { formatSeconds, formatPercentFaster } from "@/lib/format";
import { DualBarRow } from "./BarRow";
import { Legend } from "./Legend";
import { ChartFrame } from "./ChartFrame";

export function OperationTimingChart({ highlightOperation }: { highlightOperation?: string }) {
  const entries = operationTiming.entries;
  const maxSeconds = max(entries, (entry) => Math.max(entry.kubectlSeconds, entry.tuiSeconds)) || 1;
  const scale = scaleLinear().domain([0, maxSeconds]).range([0, 320]);

  return (
    <ChartFrame
      title="kubectl vs the TUI, timed by hand"
      sourceFile="site/data/operation-timing.json"
      provenance={operationTiming.sample ? "sample" : "real"}
      legend={
        <Legend
          entries={[
            { label: "kubectl / YAML", colorVar: "--series-1" },
            { label: "TUI", colorVar: "--series-2" },
          ]}
        />
      }
    >
      <ul className="timing-list">
        {entries.map((entry) => (
          <li
            key={entry.operation}
            className={`timing-row${entry.operation === highlightOperation ? " is-active" : ""}`}
          >
            <div className="timing-row-head">
              <h4>{entry.label}</h4>
              <span className="timing-delta">
                {formatPercentFaster(entry.kubectlSeconds, entry.tuiSeconds)}
              </span>
            </div>
            <DualBarRow
              valueA={entry.kubectlSeconds}
              valueB={entry.tuiSeconds}
              scale={scale}
              colorVarA="--series-1"
              colorVarB="--series-2"
              labelA={`kubectl: ${formatSeconds(entry.kubectlSeconds)}`}
              labelB={`TUI: ${formatSeconds(entry.tuiSeconds)}`}
              ariaLabel={`${entry.label}: kubectl took ${formatSeconds(entry.kubectlSeconds)}, the TUI took ${formatSeconds(entry.tuiSeconds)}`}
            />
            {entry.notes && <p className="timing-notes">{entry.notes}</p>}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
