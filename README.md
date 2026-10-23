# control-plane-eck

[![Node](https://img.shields.io/badge/node-20%2B-blue)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](tsconfig.base.json)
[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)](packages/api/src)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

An ECK (Elastic Cloud on Kubernetes) operator install analysis and an API-first
prototype for managing an Elasticsearch cluster without writing YAML or running
kubectl.

This project is not affiliated with or endorsed by Elastic.

## What's here

- `setup/` — scripts to stand up a local Kubernetes cluster (minikube) and install
  ECK + a minimal Elasticsearch cluster, timing and logging every step as real
  evidence (`setup/metrics.json`).
- `docs/market-context.md` — sourced data on why operator UX for stateful
  Kubernetes services matters.
- `packages/shared` — the TypeScript contract (types + typed client) everything
  else builds against.
- `packages/api` — a Fastify service wrapping the Kubernetes and Elasticsearch
  APIs: cluster status, credentials, scaling, version upgrades, index management.
- `packages/tui` — an Ink terminal client, the primary live-demo surface.
- `packages/web` — an optional, minimal operational UI on the same API.
- `site/` — the interactive scrollytelling presentation site, charts built only
  from real captured data (`setup/metrics.json`, `setup/operation-timing.json`),
  in the style of [The Pudding](https://pudding.cool/2025/04/wine-animals/)'s
  scroll-driven storytelling, via [Scrollama](https://github.com/russellgoldenberg/scrollama).

## Running it locally

Everything runs on your own machine. A real Docker install is required; it will
not run in a sandboxed or containerized dev environment.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (free
   for personal use), [minikube](https://minikube.sigs.k8s.io/docs/start/), and
   [kubectl](https://kubernetes.io/docs/tasks/tools/).
2. `npm install` at the repo root (npm workspaces installs every package).
3. `cp .env.example .env` and fill in real values.
4. Run `setup/` in order (see `setup/README.md`) to get a real local ECK +
   Elasticsearch cluster, and `npm run render-charts` to turn the captured metrics
   into charts.
5. `npm run dev --workspace=packages/api` to start the API, then
   `npm run dev --workspace=packages/tui` for the terminal client, or
   `npm run dev --workspace=site` for the presentation site.

## License

MIT, see `LICENSE`.
