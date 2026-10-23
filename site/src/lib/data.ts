// The single place every chart in this site reads data from. Each loader below
// corresponds 1:1 to a file in site/data/ (documented in site/data/README.md),
// so dropping in a real capture later needs no code changes here.
import type { InstallMetrics, OperationTimingReport } from "@control-plane-eck/shared";

import marketContextRaw from "../../data/market-context.json";
import installMetricsRaw from "../../data/install-metrics.json";
import rankedProblemsRaw from "../../data/ranked-problems.json";
import operationsRaw from "../../data/operations.json";
import operationTimingRaw from "../../data/operation-timing.json";

export interface MarketContextStat {
  stat: string;
  label: string;
  source: string;
  sourceUrl: string;
}

export interface RankedProblem {
  rank: number;
  title: string;
  rationale: string;
  /** cross-references InstallStepMetric.name in install-metrics.json */
  evidenceStepName: string;
}

export interface OperationCandidate {
  operation: string;
  label: string;
  painPoint: string;
  relatedProblemRank: number | null;
}

/** A sample fixture carries `sample: true`; a real capture omits it or sets it false. */
export type SampleFlagged<T> = T & { sample?: boolean };

export const marketContext = marketContextRaw as MarketContextStat[];
export const installMetrics = installMetricsRaw as SampleFlagged<InstallMetrics>;
export const rankedProblems = (rankedProblemsRaw as RankedProblem[])
  .slice()
  .sort((a, b) => a.rank - b.rank);
export const operations = operationsRaw as OperationCandidate[];
export const operationTiming = operationTimingRaw as SampleFlagged<OperationTimingReport>;

/** True when any loaded file is still a sample fixture; drives the sticky banner. */
export const usingSampleData = Boolean(installMetrics.sample) || Boolean(operationTiming.sample);

export function isPlaceholder(value: string): boolean {
  return value.includes("PLACEHOLDER");
}

export function findInstallStep(name: string) {
  return installMetrics.steps.find((step) => step.name === name) ?? null;
}
