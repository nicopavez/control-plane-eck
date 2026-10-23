"use client";

import { ScrollySection } from "@/components/ScrollySection";
import { StatTile } from "@/components/chart/StatTile";
import { marketContext } from "@/lib/data";

export function MarketFraming() {
  return (
    <ScrollySection
      id="market-framing"
      eyebrow="Why this, why now"
      title="The market this control plane sits inside"
      sticky={(activeStep) => {
        const item = marketContext[Math.min(activeStep, Math.max(marketContext.length - 1, 0))];
        return item ? <StatTile item={item} emphasis="lg" /> : null;
      }}
      steps={marketContext.map((item, index) => (
        <div key={index}>
          <p className="step-index">
            Stat {index + 1} of {marketContext.length}
          </p>
          <p className="stat-value-inline">{item.stat}</p>
          <p>{item.label}</p>
        </div>
      ))}
    />
  );
}
