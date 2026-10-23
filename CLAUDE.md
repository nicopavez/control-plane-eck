# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Read `HANDOFF.md` first for the full context, what's real versus still a template, and the definition of done.

## What this is

A Senior PM interview take-home for Control Plane: install and analyze Elastic Cloud on Kubernetes (ECK), then build a working, API-first prototype that lets an operator manage the resulting Elasticsearch cluster without writing YAML or running kubectl.

## Conventions

- Public sources only. No proprietary company material and no interview prep files (gitignored, see `HANDOFF.md`).
- Secrets as environment variables only, never hardcoded or committed. See the README's own conventions and `packages/api/src/config.ts`.
- The repo's public-facing docs (README, `docs/market-context.md`) should read as a normal finished-looking project, not a build log. Work-in-progress status, TODOs, and anything not meant for an outside reader belongs in `HANDOFF.md`, not in tracked public files.
- Do not push to a remote without asking, unless the user has already established an ongoing go-ahead for this repo in the current session.
- Commit subjects are short and imperative.
