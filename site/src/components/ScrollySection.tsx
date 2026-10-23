"use client";

import { useState, type ReactNode } from "react";
import { useScrollama } from "@/hooks/useScrollama";

export interface ScrollySectionProps {
  id: string;
  eyebrow: string;
  title: string;
  /** Rendered once into the sticky panel; receives the active step index. */
  sticky: (activeStep: number) => ReactNode;
  /** One block of narrative text per scroll step. */
  steps: ReactNode[];
}

/**
 * The pudding.cool-style scrollytelling shell: narrative text steps scroll
 * past a `position: sticky` visualization panel. Scrollama (IntersectionObserver)
 * only decides which step is "active" — CSS sticky positioning does the pinning.
 */
export function ScrollySection({ id, eyebrow, title, sticky, steps }: ScrollySectionProps) {
  const [activeStep, setActiveStep] = useState(0);

  useScrollama({
    stepSelector: `#${id} .scrolly-step`,
    offset: 0.6,
    onStepEnter: ({ index }) => setActiveStep(index),
    deps: [steps.length],
  });

  return (
    <section id={id} className="scrolly-section" aria-labelledby={`${id}-title`}>
      <header className="scrolly-section-header">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
      </header>
      <div className="scrolly-grid">
        <div className="scrolly-sticky-col">
          <div className="scrolly-sticky-panel">{sticky(activeStep)}</div>
        </div>
        <div className="scrolly-steps-col">
          {steps.map((content, index) => (
            <div
              className={`scrolly-step${index === activeStep ? " is-active" : ""}`}
              data-step-index={index}
              key={index}
            >
              {content}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
