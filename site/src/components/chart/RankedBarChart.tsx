import { scaleLinear } from "d3-scale";
import { max } from "d3-array";
import { rankedProblems, findInstallStep, isPlaceholder } from "@/lib/data";
import { formatSeconds } from "@/lib/format";
import { SingleBarRow } from "./BarRow";
import { ChartFrame } from "./ChartFrame";

export function RankedBarChart({ highlightRank }: { highlightRank?: number }) {
  const rows = rankedProblems.map((problem) => ({
    problem,
    step: findInstallStep(problem.evidenceStepName),
  }));
  const maxDuration = max(rows, (r) => r.step?.durationSeconds ?? 0) || 1;
  const scale = scaleLinear().domain([0, maxDuration]).range([0, 320]);

  return (
    <ChartFrame
      title="Ranked problems, by real install evidence"
      sourceFile="site/data/ranked-problems.json"
      provenance="mixed"
    >
      <ol className="ranked-list">
        {rows.map(({ problem, step }) => {
          const placeholder = isPlaceholder(problem.title);
          return (
            <li
              key={problem.rank}
              className={`ranked-row${problem.rank === highlightRank ? " is-active" : ""}`}
            >
              <div className="ranked-row-head">
                <span className="rank-badge">{problem.rank}</span>
                <h4 className={placeholder ? "is-placeholder" : undefined}>{problem.title}</h4>
              </div>
              <p className={placeholder ? "is-placeholder" : "ranked-rationale"}>{problem.rationale}</p>
              {step ? (
                <SingleBarRow
                  value={step.durationSeconds}
                  scale={scale}
                  colorVar="--series-1"
                  valueLabel={`${formatSeconds(step.durationSeconds)} — ${step.label}`}
                  ariaLabel={`Evidence: ${step.label} took ${formatSeconds(step.durationSeconds)}`}
                />
              ) : (
                <p className="chart-note">
                  No install step named &quot;{problem.evidenceStepName}&quot; was found in
                  install-metrics.json.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </ChartFrame>
  );
}
