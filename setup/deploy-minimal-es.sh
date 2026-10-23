#!/usr/bin/env bash
# Step 3 of Task 1: deploy a minimal Elasticsearch cluster via the ECK operator.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/metrics.sh"

run_step deploy_elasticsearch "Apply the minimal Elasticsearch CR" -- \
  kubectl apply -f "$(dirname "${BASH_SOURCE[0]}")/minimal-elasticsearch.yaml"

run_step wait_elasticsearch_green "Wait for the cluster to report health=green" -- bash -c '
  for i in $(seq 1 60); do
    health=$(kubectl get elasticsearch quickstart -o jsonpath="{.status.health}" 2>/dev/null)
    phase=$(kubectl get elasticsearch quickstart -o jsonpath="{.status.phase}" 2>/dev/null)
    echo "  [$i/60] phase=${phase:-<none>} health=${health:-<none>}"
    if [ "${health}" = "green" ]; then
      exit 0
    fi
    sleep 5
  done
  echo "Did not reach health=green within 5 minutes."
  exit 1
'

if [ $? -ne 0 ]; then
  run_step elasticsearch_failure_diagnostics "Capture Elasticsearch CR status and events on failure" -- bash -c '
    echo "--- kubectl get elasticsearch quickstart -o yaml ---"
    kubectl get elasticsearch quickstart -o yaml
    echo "--- kubectl get pods -l elasticsearch.k8s.elastic.co/cluster-name=quickstart ---"
    kubectl get pods -l elasticsearch.k8s.elastic.co/cluster-name=quickstart
    echo "--- kubectl get events --sort-by=.lastTimestamp ---"
    kubectl get events --sort-by=.lastTimestamp
  '
fi

echo
echo "Elasticsearch deployed. setup/metrics.json now has real install timing/errors."
echo "Next: review setup/metrics.json, then run 'npm run render-charts' to generate docs/assets charts,"
echo "and fill in docs/task1-install-analysis.md with your real observations."
echo
echo "To fetch credentials by hand for a sanity check (the TUI/API will do this for you later):"
echo '  kubectl get secret quickstart-es-elastic-user -o go-template='"'"'{{.data.elastic | base64decode}}'"'"
