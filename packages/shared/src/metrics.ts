// Shape of the real, captured evidence this project is built on.
// setup/ (bash) writes JSON matching InstallMetrics to setup/metrics.json.
// scripts/render-charts.ts and site/ both read it; nothing here is invented data.

export interface InstallStepMetric {
  /** stable machine name, e.g. "minikube_start" */
  name: string;
  /** human label for charts/docs, e.g. "Start minikube cluster" */
  label: string;
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  durationSeconds: number;
  exitCode: number;
  ok: boolean;
  /** captured stderr/events tail on failure, secrets already scrubbed by setup/lib/metrics.sh */
  error: string | null;
}

export interface InstallMetrics {
  runId: string; // ISO 8601 timestamp of run start
  tool: "minikube";
  steps: InstallStepMetric[];
  totalDurationSeconds: number;
}

export interface OperationTimingEntry {
  /** matches a packages/api operation id, e.g. "scale_nodeset" */
  operation: string;
  label: string;
  /** seconds to do it by hand with kubectl/YAML, timed manually during Task 1/2 */
  kubectlSeconds: number;
  /** seconds to do it through the TUI, timed the same way */
  tuiSeconds: number;
  notes?: string;
}

export interface OperationTimingReport {
  measuredAt: string; // ISO 8601
  entries: OperationTimingEntry[];
}
