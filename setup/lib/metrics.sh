#!/usr/bin/env bash
# Shared helpers for setup/*.sh: time each step, capture real errors, scrub secrets,
# and accumulate everything into setup/metrics.json matching
# packages/shared/src/metrics.ts's InstallMetrics shape. This is the raw evidence
# Task 1's install-analysis writeup and the site/ charts are built from — nothing
# here is synthetic.
#
# Requires: jq. Install it first (e.g. `choco install jq` on Windows, `brew install jq`
# on macOS, `apt-get install jq` on most Linux) if `jq --version` fails below.
set -uo pipefail

SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METRICS_FILE="${SETUP_DIR}/metrics.json"
RAW_LOG="${SETUP_DIR}/install.raw.log"   # full, unscrubbed output — gitignored, local only

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required (https://jqlang.github.io/jq/download/). Install it and re-run." >&2
  exit 1
fi

RUN_ID="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Known secret-shaped patterns we never want to land in a committed file:
# base64 blobs that follow a password/cert-looking key, and anything explicitly
# piped through `scrub_secret` below. This is defense in depth, not the only
# control — scripts should avoid printing secrets to stdout/stderr in the first
# place (see install-eck.sh / deploy-minimal-es.sh for where credentials get
# fetched; that path never goes through this logger).
scrub_secret() {
  sed -E \
    -e 's/(password|elastic)["]?:?[[:space:]]*[A-Za-z0-9+\/=]{16,}/\1: [REDACTED]/gi' \
    -e 's/-----BEGIN [A-Z ]+-----[^-]*-----END [A-Z ]+-----/[REDACTED CERTIFICATE]/g'
}

if [ ! -f "${METRICS_FILE}" ]; then
  jq -n --arg runId "${RUN_ID}" --arg tool "minikube" \
    '{runId: $runId, tool: $tool, steps: [], totalDurationSeconds: 0}' \
    > "${METRICS_FILE}"
fi

# run_step <name> <label> -- <command...>
# Times the command, records exit code, appends a scrubbed error tail on failure,
# and updates setup/metrics.json. Does not abort the script on failure by default
# (the caller decides whether a failed step is fatal) — this is deliberate, since
# "what broke and what I did next" is itself evidence worth capturing.
run_step() {
  local name="$1" label="$2"
  shift 2
  if [ "$1" != "--" ]; then
    echo "run_step usage: run_step <name> <label> -- <command...>" >&2
    return 2
  fi
  shift

  echo "==> ${label}"
  local started finished duration exit_code error_tail="null" ok
  started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local start_epoch end_epoch
  start_epoch="$(date +%s)"

  {
    echo "--- step: ${name} (${started}) ---"
    "$@"
  } >>"${RAW_LOG}" 2>&1
  exit_code=$?

  end_epoch="$(date +%s)"
  finished="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  duration=$((end_epoch - start_epoch))

  if [ "${exit_code}" -eq 0 ]; then
    ok=true
  else
    ok=false
    # last 40 lines of this step's output, scrubbed, as the captured evidence
    error_tail="$(scrub_secret < "${RAW_LOG}" | tail -n 40 | jq -Rs .)"
  fi

  local tmp
  tmp="$(mktemp)"
  jq \
    --arg name "${name}" --arg label "${label}" \
    --arg startedAt "${started}" --arg finishedAt "${finished}" \
    --argjson durationSeconds "${duration}" --argjson exitCode "${exit_code}" \
    --argjson ok "${ok}" --argjson error "${error_tail}" \
    '.steps += [{name: $name, label: $label, startedAt: $startedAt, finishedAt: $finishedAt, durationSeconds: $durationSeconds, exitCode: $exitCode, ok: $ok, error: $error}]
     | .totalDurationSeconds = ([.steps[].durationSeconds] | add)' \
    "${METRICS_FILE}" > "${tmp}" && mv "${tmp}" "${METRICS_FILE}"

  if [ "${ok}" = true ]; then
    echo "    done in ${duration}s"
  else
    echo "    FAILED (exit ${exit_code}) after ${duration}s — see ${RAW_LOG} and setup/metrics.json" >&2
  fi
  return "${exit_code}"
}
