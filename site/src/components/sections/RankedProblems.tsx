"use client";

import { ScrollySection } from "@/components/ScrollySection";
import { RankedBarChart } from "@/components/chart/RankedBarChart";
import { rankedProblems, isPlaceholder } from "@/lib/data";

export function RankedProblems() {
  return (
    <ScrollySection
      id="ranked-problems"
      eyebrow="What's actually broken"
      title="The problems, ranked by evidence"
      sticky={(activeStep) => {
        const problem = rankedProblems[Math.min(activeStep, Math.max(rankedProblems.length - 1, 0))];
        return <RankedBarChart highlightRank={problem?.rank} />;
      }}
      steps={rankedProblems.map((problem) => (
        <div key={problem.rank}>
          <p className="step-index">Problem #{problem.rank}</p>
          <h3 className={isPlaceholder(problem.title) ? "is-placeholder" : undefined}>{problem.title}</h3>
          <p className={isPlaceholder(problem.rationale) ? "is-placeholder" : undefined}>
            {problem.rationale}
          </p>
        </div>
      ))}
    />
  );
}
