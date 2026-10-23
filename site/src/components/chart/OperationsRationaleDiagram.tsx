import { operations, rankedProblems, isPlaceholder } from "@/lib/data";
import { ChartFrame } from "./ChartFrame";

const SLOT_BY_RANK = [
  "--series-1",
  "--series-2",
  "--series-3",
  "--series-4",
  "--series-5",
  "--series-6",
  "--series-7",
  "--series-8",
];

export function OperationsRationaleDiagram({ highlightOperation }: { highlightOperation?: string }) {
  return (
    <ChartFrame
      title="Candidate operations, mapped to ranked problems"
      sourceFile="site/data/operations.json"
      provenance="mixed"
    >
      <ul className="operations-grid">
        {operations.map((op) => {
          const related =
            op.relatedProblemRank != null
              ? rankedProblems.find((problem) => problem.rank === op.relatedProblemRank)
              : null;
          const colorVar =
            op.relatedProblemRank != null
              ? SLOT_BY_RANK[(op.relatedProblemRank - 1) % SLOT_BY_RANK.length]
              : "--text-muted";
          return (
            <li
              key={op.operation}
              className={`operation-card${op.operation === highlightOperation ? " is-active" : ""}`}
              style={{ borderLeftColor: `var(${colorVar})` }}
            >
              <h4>{op.label}</h4>
              <p className="operation-pain">{op.painPoint}</p>
              {related ? (
                <p className={`operation-link${isPlaceholder(related.title) ? " is-placeholder" : ""}`}>
                  &rarr; addresses problem #{related.rank}: {related.title}
                </p>
              ) : (
                <p className="operation-link operation-link-muted">
                  &mdash; foundational capability, not tied to a single ranked problem
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}
