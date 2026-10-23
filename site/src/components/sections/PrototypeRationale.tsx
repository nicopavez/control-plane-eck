"use client";

import { ScrollySection } from "@/components/ScrollySection";
import { OperationsRationaleDiagram } from "@/components/chart/OperationsRationaleDiagram";
import { operations } from "@/lib/data";

export function PrototypeRationale() {
  return (
    <ScrollySection
      id="prototype-rationale"
      eyebrow="Why these operations"
      title="The prototype's candidate operations"
      sticky={(activeStep) => {
        const op = operations[Math.min(activeStep, Math.max(operations.length - 1, 0))];
        return <OperationsRationaleDiagram highlightOperation={op?.operation} />;
      }}
      steps={operations.map((op) => (
        <div key={op.operation}>
          <h3>{op.label}</h3>
          <p>{op.painPoint}</p>
        </div>
      ))}
    />
  );
}
