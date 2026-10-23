"use client";

import { ScrollySection } from "@/components/ScrollySection";
import { InstallJourneyChart } from "@/components/chart/InstallJourneyChart";
import { installMetrics } from "@/lib/data";
import { formatSeconds } from "@/lib/format";

export function InstallJourney() {
  const steps = installMetrics.steps;
  const isSample = Boolean(installMetrics.sample);

  return (
    <ScrollySection
      id="install-journey"
      eyebrow="The install journey"
      title="What actually happens standing up ECK"
      sticky={(activeStep) => (
        <InstallJourneyChart steps={steps} revealedCount={activeStep + 1} isSample={isSample} />
      )}
      steps={steps.map((step, index) => (
        <div key={step.name}>
          <p className="step-index">
            Step {index + 1} of {steps.length}
          </p>
          <h3 className={step.ok ? undefined : "is-error"}>{step.label}</h3>
          <p>
            {step.ok
              ? `Finished in ${formatSeconds(step.durationSeconds)}.`
              : `Failed after ${formatSeconds(step.durationSeconds)} (exit code ${step.exitCode}).`}
          </p>
          {!step.ok && step.error && <p className="step-error">{step.error}</p>}
        </div>
      ))}
    />
  );
}
