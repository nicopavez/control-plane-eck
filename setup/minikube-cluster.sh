#!/usr/bin/env bash
# Step 1 of Task 1: start a local Kubernetes cluster with minikube.
# Run from the repo root: ./setup/minikube-cluster.sh
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/metrics.sh"

run_step prerequisites_check "Check docker, minikube, kubectl are installed" -- bash -c '
  command -v docker >/dev/null || { echo "docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"; exit 1; }
  command -v minikube >/dev/null || { echo "minikube not found. Install: https://minikube.sigs.k8s.io/docs/start/"; exit 1; }
  command -v kubectl >/dev/null || { echo "kubectl not found. Install: https://kubernetes.io/docs/tasks/tools/"; exit 1; }
  docker info >/dev/null || { echo "docker daemon not reachable, is Docker Desktop running?"; exit 1; }
'

run_step minikube_start "Start minikube cluster" -- \
  minikube start --cpus=4 --memory=6g --driver=docker

run_step minikube_status "Confirm cluster is Running" -- \
  minikube status

echo
echo "Cluster is up. Next: ./setup/install-eck.sh"
