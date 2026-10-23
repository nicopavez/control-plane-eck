#!/usr/bin/env bash
# Step 2 of Task 1: install the ECK operator.
#
# ECK_VERSION defaults to a recent version at the time this repo was scaffolded.
# Before running, check the current version against Elastic's own quickstart docs
# (https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-yaml-manifest-quickstart)
# and update the default below if a newer one exists — this mismatch, if you hit it,
# is itself worth noting in the Task 1 writeup.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/metrics.sh"

ECK_VERSION="${ECK_VERSION:-3.5.0}"
CRDS_URL="https://download.elastic.co/downloads/eck/${ECK_VERSION}/crds.yaml"
OPERATOR_URL="https://download.elastic.co/downloads/eck/${ECK_VERSION}/operator.yaml"

echo "Using ECK ${ECK_VERSION} (override with ECK_VERSION=x.y.z ./setup/install-eck.sh)"

run_step install_crds "Install ECK CRDs" -- \
  kubectl create -f "${CRDS_URL}"

run_step install_operator "Install ECK operator" -- \
  kubectl apply -f "${OPERATOR_URL}"

run_step wait_operator_ready "Wait for the operator to be ready" -- bash -c '
  kubectl -n elastic-system rollout status statefulset/elastic-operator --timeout=180s
'

if [ $? -ne 0 ]; then
  echo "Operator did not become ready in time. Capturing logs/events for the writeup..." >&2
  run_step operator_failure_diagnostics "Capture operator logs and events on failure" -- bash -c '
    echo "--- kubectl -n elastic-system get pods ---"
    kubectl -n elastic-system get pods
    echo "--- kubectl -n elastic-system logs statefulset/elastic-operator (tail) ---"
    kubectl -n elastic-system logs statefulset/elastic-operator --tail=100
    echo "--- kubectl -n elastic-system get events --sort-by=.lastTimestamp ---"
    kubectl -n elastic-system get events --sort-by=.lastTimestamp
  '
fi

echo
echo "Operator installed. Next: ./setup/deploy-minimal-es.sh"
