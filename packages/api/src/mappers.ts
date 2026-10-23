import type { ClusterStatus, Condition, NodeSetStatus, UpgradeProgress } from "@control-plane-eck/shared";
import type { ElasticsearchCondition, ElasticsearchCR, ElasticsearchNodeSetSpec } from "./k8s.js";

function normalizeHealth(health: string | undefined): ClusterStatus["health"] {
  if (health === "green" || health === "yellow" || health === "red") return health;
  return "unknown";
}

function normalizeConditionStatus(status: string): Condition["status"] {
  if (status === "True" || status === "False") return status;
  return "Unknown";
}

function mapConditions(conditions: ElasticsearchCondition[] | undefined): Condition[] {
  // Older ECK versions don't populate status.conditions at all.
  if (!conditions) return [];
  return conditions.map((condition) => ({
    type: condition.type,
    status: normalizeConditionStatus(condition.status),
    message: condition.message,
    lastTransitionTime: condition.lastTransitionTime,
  }));
}

function extractRoles(nodeSet: ElasticsearchNodeSetSpec): string[] {
  const roles = nodeSet.config?.node?.roles;
  return Array.isArray(roles) ? roles : [];
}

/**
 * ECK's Elasticsearch status reports a single cluster-wide
 * `availableNodes`, not a per-nodeSet breakdown. We approximate a
 * per-nodeSet ready count by handing out available nodes to nodeSets in
 * spec order, capped at each one's desired count. When the cluster is
 * fully available (the common case) this is exact; mid-rollout or
 * mid-failure it is an approximation, since we can't tell which specific
 * nodeSet is short a node without listing Pods by the
 * `elasticsearch.k8s.elastic.co/node-set` label, which this service does
 * not do.
 */
function distributeReadyCounts(nodeSets: ElasticsearchNodeSetSpec[], availableNodes: number): NodeSetStatus[] {
  let remaining = availableNodes;
  return nodeSets.map((nodeSet) => {
    const ready = Math.max(0, Math.min(nodeSet.count, remaining));
    remaining -= ready;
    return {
      name: nodeSet.name,
      desiredCount: nodeSet.count,
      readyCount: ready,
      roles: extractRoles(nodeSet),
    };
  });
}

export function mapClusterStatus(cr: ElasticsearchCR, fallbackName: string, fallbackNamespace: string): ClusterStatus {
  const nodeSetsSpec = cr.spec.nodeSets ?? [];
  const availableNodes = cr.status?.availableNodes ?? 0;
  return {
    name: cr.metadata?.name ?? fallbackName,
    namespace: cr.metadata?.namespace ?? fallbackNamespace,
    phase: cr.status?.phase ?? "Unknown",
    health: normalizeHealth(cr.status?.health),
    version: cr.status?.version ?? cr.spec.version,
    availableNodes,
    nodeSets: distributeReadyCounts(nodeSetsSpec, availableNodes),
    conditions: mapConditions(cr.status?.conditions),
    observedGeneration: cr.status?.observedGeneration ?? 0,
  };
}

export function mapUpgradeProgress(cr: ElasticsearchCR): UpgradeProgress {
  const desiredVersion = cr.spec.version;
  const currentVersion = cr.status?.version ?? desiredVersion;
  const phase = cr.status?.phase ?? "Unknown";
  const observedGeneration = cr.status?.observedGeneration ?? 0;
  const generation = cr.metadata?.generation ?? 0;
  // "Done" means the operator has both seen our latest spec change
  // (observedGeneration caught up to metadata.generation) and reports the
  // cluster as Ready on the version we asked for, not just that the
  // version strings happen to match before the rollout has even started.
  const done = phase === "Ready" && observedGeneration >= generation && currentVersion === desiredVersion;
  return {
    desiredVersion,
    currentVersion,
    phase,
    observedGeneration,
    conditions: mapConditions(cr.status?.conditions),
    done,
  };
}
