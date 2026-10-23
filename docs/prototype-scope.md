# Task 2: Prototype scope

## Who it's for

> TODO: name the persona precisely (e.g. "an SRE on-call for an ECK-managed cluster
> who doesn't want to context-switch into YAML/kubectl to answer 'is this healthy'
> or 'can I scale this safely'"). Tie it back to a real problem from
> `task1-install-analysis.md`, not a generic "operators everywhere."

## Why these operations

The prototype's operations were chosen to answer specific problems found during
Task 1, not as a general ECK feature tour. Candidate list below; **revisit this
table after Task 1 is actually done** — keep what maps to a real problem, cut what
doesn't, and don't be afraid to add one that wasn't anticipated here.

| Operation | Pain point it targets | Maps to Task 1 problem # |
|---|---|---|
| Health/status dashboard | CR status is opaque; today you `kubectl describe` and parse by hand | TODO |
| Fetch credentials + CA | Non-obvious secret naming and base64 decoding | TODO |
| Scale a NodeSet | Scaling semantics (StatefulSet mapping) aren't obvious from the CR alone | TODO |
| Version upgrade with live progress | Upgrade is "edit one YAML field" with zero feedback | TODO |
| Index management (list/create/delete, shard health) | ECK explicitly does not manage indices at all | TODO |
| Snapshot trigger/restore (stretch) | Backup/restore is entirely left to the operator, no CRD support | TODO |

## What was deliberately left out

> TODO. Likely candidates to discuss: multi-cluster management, Kibana space
> management, ILM policy authoring, cross-cluster replication, fine-grained RBAC
> within Elasticsearch, autoscaling. For each, say *why* it's out (not in scope for
> the persona above, too complex for the time budget, doesn't map to a Task 1
> finding, etc.) rather than just listing it.

## What I'd need to learn to build this for real

> TODO. Likely candidates: how this persona's team actually triages incidents
> today (to validate the persona guess above), ECK's behavior under real failure
> modes (not just the happy path this prototype demos), how multi-tenant or
> multi-cluster operators would want this to scale, real user research instead of
> one person's judgment.

## Build cost vs value (for the "next months of investment" ask)

| Operation | Build cost (this prototype) | Build cost (production-grade) |
|---|---|---|
| Health/status dashboard | Low | Low-medium (needs real alerting integration) |
| Fetch credentials + CA | Low | Low |
| Scale a NodeSet | Low-medium | Medium (needs guardrails, e.g. confirm before scaling down masters) |
| Version upgrade with progress | Medium | Medium-high (needs rollback path, pre-flight checks) |
| Index management | Medium | Medium-high (real ILM/lifecycle integration) |
| Snapshot trigger/restore | Medium-high | High (repository credential management, restore safety) |
