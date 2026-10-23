#!/usr/bin/env node
// Turns the real evidence in setup/metrics.json and setup/operation-timing.json
// into static SVG charts under docs/assets/, embedded by docs/task1-install-analysis.md
// and the top-level README. Run with `npm run render-charts`.
//
// Colors follow this session's dataviz skill reference palette (references/palette.md):
// status colors (good/critical) for pass/fail, categorical slots 1/2 (blue/orange)
// for the kubectl-vs-TUI comparison, with direct labels so nothing relies on hue alone.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear, scaleBand } from "d3-scale";
import type { InstallMetrics, OperationTimingReport } from "@control-plane-eck/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ASSETS_DIR = join(ROOT, "docs", "assets");

const PALETTE = {
  surfaceLight: "#fcfcfb",
  primaryInk: "#0b0b0b",
  secondaryInk: "#52514e",
  mutedInk: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  good: "#0ca30c",
  critical: "#d03b3b",
  series1: "#2a78d6", // categorical slot 1 (blue) - kubectl/YAML
  series2: "#eb6834", // categorical slot 2 (orange) - TUI
  labelOnFill: "#ffffff",
};

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function svgDoc(width: number, height: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${PALETTE.surfaceLight}" />
  <style>
    text { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    .title { font-size: 15px; font-weight: 600; fill: ${PALETTE.primaryInk}; }
    .label { font-size: 12px; fill: ${PALETTE.secondaryInk}; }
    .value { font-size: 12px; fill: ${PALETTE.primaryInk}; font-variant-numeric: tabular-nums; }
    .muted { font-size: 11px; fill: ${PALETTE.mutedInk}; }
  </style>
  <text x="16" y="24" class="title">${title}</text>
  ${body}
</svg>`;
}

function barColor(ok: boolean): string {
  return ok ? PALETTE.series1 : PALETTE.critical;
}

/** Chart 1: duration per install step, failed steps called out in status red. */
function renderInstallSteps(metrics: InstallMetrics): string {
  const width = 760;
  const rowHeight = 34;
  const chartTop = 48;
  const chartLeft = 200;
  const chartRight = width - 90;
  const height = chartTop + metrics.steps.length * rowHeight + 24;

  const maxDuration = Math.max(1, ...metrics.steps.map((s) => s.durationSeconds));
  const x = scaleLinear().domain([0, maxDuration]).range([0, chartRight - chartLeft]);

  const rows = metrics.steps
    .map((step, i) => {
      const y = chartTop + i * rowHeight;
      const barWidth = Math.max(2, x(step.durationSeconds));
      const color = barColor(step.ok);
      const statusGlyph = step.ok ? "✓" : "✕"; // check / cross, never color alone
      return `
    <text x="${chartLeft - 12}" y="${y + rowHeight / 2 + 4}" class="label" text-anchor="end">${escapeXml(step.label)}</text>
    <rect x="${chartLeft}" y="${y + 6}" width="${barWidth}" height="${rowHeight - 14}" rx="4" fill="${color}" />
    <text x="${chartLeft + barWidth + 8}" y="${y + rowHeight / 2 + 4}" class="value">${statusGlyph} ${step.durationSeconds}s</text>`;
    })
    .join("\n");

  const gridlines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const gx = chartLeft + (chartRight - chartLeft) * f;
      return `<line x1="${gx}" y1="${chartTop - 8}" x2="${gx}" y2="${chartTop + metrics.steps.length * rowHeight}" stroke="${PALETTE.gridline}" stroke-width="1" />`;
    })
    .join("\n");

  const body = `${gridlines}\n${rows}
  <text x="16" y="${height - 6}" class="muted">Total: ${metrics.totalDurationSeconds}s · run ${metrics.runId} · ✓ ok ✕ failed (captured error in setup/metrics.json)</text>`;

  return svgDoc(width, height, body, "Time per install step (real, captured locally)");
}

/** Chart 2: a simple left-to-right timeline/waterfall of the whole install. */
function renderInstallTimeline(metrics: InstallMetrics): string {
  const width = 760;
  const height = 160;
  const chartLeft = 16;
  const chartRight = width - 16;
  const barY = 70;
  const barHeight = 28;

  if (metrics.steps.length === 0) {
    return svgDoc(width, height, `<text x="16" y="60" class="label">No steps recorded yet — run setup/ to generate real data.</text>`, "Install timeline");
  }

  const start0 = new Date(metrics.steps[0]!.startedAt).getTime();
  const endLast = new Date(metrics.steps[metrics.steps.length - 1]!.finishedAt).getTime();
  const totalMs = Math.max(1, endLast - start0);
  const x = scaleLinear().domain([0, totalMs]).range([chartLeft, chartRight]);

  const segments = metrics.steps
    .map((step) => {
      const segStart = x(new Date(step.startedAt).getTime() - start0);
      const segEnd = x(new Date(step.finishedAt).getTime() - start0);
      const w = Math.max(2, segEnd - segStart);
      return `<rect x="${segStart}" y="${barY}" width="${w}" height="${barHeight}" fill="${barColor(step.ok)}" stroke="${PALETTE.surfaceLight}" stroke-width="2" />`;
    })
    .join("\n");

  const firstLabel = escapeXml(metrics.steps[0]!.label);
  const lastLabel = escapeXml(metrics.steps[metrics.steps.length - 1]!.label);

  const body = `
  <line x1="${chartLeft}" y1="${barY + barHeight + 10}" x2="${chartRight}" y2="${barY + barHeight + 10}" stroke="${PALETTE.baseline}" />
  ${segments}
  <text x="${chartLeft}" y="${barY - 10}" class="label">${firstLabel}</text>
  <text x="${chartRight}" y="${barY - 10}" class="label" text-anchor="end">${lastLabel}</text>
  <text x="16" y="${height - 16}" class="muted">${metrics.steps.length} steps, ${metrics.totalDurationSeconds}s total, start to finish.</text>`;

  return svgDoc(width, height, body, "Install journey, start to finish");
}

/** Chart 3: kubectl/YAML vs TUI time per operation, paired bars. */
function renderOperationTiming(report: OperationTimingReport): string {
  const width = 760;
  const rowHeight = 56;
  const chartTop = 64;
  const chartLeft = 200;
  const chartRight = width - 90;
  const height = chartTop + report.entries.length * rowHeight + 36;

  const maxSeconds = Math.max(1, ...report.entries.flatMap((e) => [e.kubectlSeconds, e.tuiSeconds]));
  const x = scaleLinear().domain([0, maxSeconds]).range([0, chartRight - chartLeft]);

  const rows = report.entries
    .map((entry, i) => {
      const yGroup = chartTop + i * rowHeight;
      const kWidth = Math.max(2, x(entry.kubectlSeconds));
      const tWidth = Math.max(2, x(entry.tuiSeconds));
      return `
    <text x="${chartLeft - 12}" y="${yGroup + rowHeight / 2}" class="label" text-anchor="end">${escapeXml(entry.label)}</text>
    <rect x="${chartLeft}" y="${yGroup + 2}" width="${kWidth}" height="18" rx="3" fill="${PALETTE.series1}" />
    <text x="${chartLeft + kWidth + 8}" y="${yGroup + 15}" class="value">${entry.kubectlSeconds}s</text>
    <rect x="${chartLeft}" y="${yGroup + 26}" width="${tWidth}" height="18" rx="3" fill="${PALETTE.series2}" />
    <text x="${chartLeft + tWidth + 8}" y="${yGroup + 39}" class="value">${entry.tuiSeconds}s</text>`;
    })
    .join("\n");

  const legend = `
  <rect x="16" y="36" width="12" height="12" rx="2" fill="${PALETTE.series1}" /><text x="32" y="46" class="label">kubectl / YAML</text>
  <rect x="150" y="36" width="12" height="12" rx="2" fill="${PALETTE.series2}" /><text x="166" y="46" class="label">TUI</text>`;

  const body = `${legend}\n${rows}
  <text x="16" y="${height - 10}" class="muted">Measured ${report.measuredAt}. Shorter bar wins.</text>`;

  return svgDoc(width, height, body, "Time to complete each operation, kubectl vs the TUI");
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] as string);
}

function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });

  const metrics = readJson<InstallMetrics>(join(ROOT, "setup", "metrics.json"), {
    runId: "",
    tool: "minikube",
    steps: [],
    totalDurationSeconds: 0,
  });
  const timing = readJson<OperationTimingReport>(join(ROOT, "setup", "operation-timing.json"), {
    measuredAt: "",
    entries: [],
  });

  writeFileSync(join(ASSETS_DIR, "install-steps.svg"), renderInstallSteps(metrics));
  writeFileSync(join(ASSETS_DIR, "install-timeline.svg"), renderInstallTimeline(metrics));
  writeFileSync(join(ASSETS_DIR, "operation-timing.svg"), renderOperationTiming(timing));

  if (metrics.steps.length === 0) {
    console.warn("setup/metrics.json has no steps yet — charts were written with empty/placeholder data. Run setup/ first.");
  }
  if (timing.entries.length === 0) {
    console.warn("setup/operation-timing.json has no entries yet — fill it in after timing each operation by hand and via the TUI.");
  }
  console.log(`Wrote charts to ${ASSETS_DIR}`);
}

main();
