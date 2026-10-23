"use client";

import { ScrollySection } from "@/components/ScrollySection";
import { OperationTimingChart } from "@/components/chart/OperationTimingChart";
import { operationTiming } from "@/lib/data";
import { formatSeconds, formatPercentFaster } from "@/lib/format";

export function BeforeAfter() {
  const entries = operationTiming.entries;

  return (
    <ScrollySection
      id="before-after"
      eyebrow="Before / after"
      title="What the TUI actually saves"
      sticky={(activeStep) => {
        const entry = entries[Math.min(activeStep, Math.max(entries.length - 1, 0))];
        return <OperationTimingChart highlightOperation={entry?.operation} />;
      }}
      steps={entries.map((entry) => (
        <div key={entry.operation}>
          <h3>{entry.label}</h3>
          <p>
            kubectl: {formatSeconds(entry.kubectlSeconds)} &middot; TUI: {formatSeconds(entry.tuiSeconds)}{" "}
            &middot; {formatPercentFaster(entry.kubectlSeconds, entry.tuiSeconds)}
          </p>
          {entry.notes && <p>{entry.notes}</p>}
        </div>
      ))}
    />
  );
}
