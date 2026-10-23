# site/data

Every chart in `site/` reads from one of the JSON files in this folder. None of them
are fetched at runtime from a live cluster or API; the site is pure static data.

## Files and the type each one feeds

| File | Shape | Consumer |
|---|---|---|
| `market-context.json` | `MarketContextStat[]` (`stat`, `label`, `source`, `sourceUrl`) | Section 1, market framing stat callouts |
| `install-metrics.json` | `InstallMetrics` from `@control-plane-eck/shared` | Section 2, install journey waterfall |
| `ranked-problems.json` | `RankedProblem[]` (`rank`, `title`, `rationale`, `evidenceStepName`) | Section 3, ranked problems bar chart |
| `operations.json` | `OperationCandidate[]` (`operation`, `label`, `painPoint`, `relatedProblemRank`) | Section 4, prototype rationale diagram |
| `operation-timing.json` | `OperationTimingReport` from `@control-plane-eck/shared` | Section 5, before/after grouped bars |

`evidenceStepName` in `ranked-problems.json` cross-references an `InstallStepMetric.name`
in `install-metrics.json`, so the ranked-problems chart can show the real duration/error
tied to that problem instead of a second, disconnected number.

## The sample-data convention

`install-metrics.json` and `operation-timing.json` hold numbers from an actual timed run.
Until that run happens, this folder ships schema-correct **sample** fixtures instead, so
the site renders correctly during development.

A sample file is marked with a top-level `"sample": true` field. The real, captured file
that replaces it **must not** carry that field (or must set it to `false`). The site reads
this field at build/render time and shows a sticky "Showing sample data" banner across the
whole page whenever any loaded file is marked `sample: true`. This is deliberate and loud:
nobody should present `sample: true` data as a real finding.

To drop in real data after Task 1/2: replace the file's contents with the real capture
(matching the shape in the table above) and remove the `sample` field (or set it to
`false`). No code changes are needed; the banner disappears on its own once every file
that carries the field reports `false`.

`market-context.json` and `ranked-problems.json` do not use the `sample` flag. Instead
their placeholder entries are marked inline, with the literal text `PLACEHOLDER` inside
the field a human still needs to fill in. Replace those entries directly.
