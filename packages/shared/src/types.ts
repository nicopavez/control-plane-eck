// Contract shared by packages/api (producer), packages/tui, packages/web and site/ (consumers).
// Nothing here talks to Kubernetes or Elasticsearch directly; it's just shapes and a client.

export interface Condition {
  type: string;
  status: "True" | "False" | "Unknown";
  message?: string;
  lastTransitionTime?: string;
}

export interface NodeSetStatus {
  name: string;
  desiredCount: number;
  readyCount: number;
  roles: string[];
}

export interface ClusterStatus {
  name: string;
  namespace: string;
  phase: string;
  health: "green" | "yellow" | "red" | "unknown";
  version: string;
  availableNodes: number;
  nodeSets: NodeSetStatus[];
  conditions: Condition[];
  observedGeneration: number;
}

export interface Credentials {
  username: string;
  password: string;
  caCertPem: string;
  /** Ready-to-paste snippet, e.g. a curl command. The API builds this; nothing here persists it. */
  curlSnippet: string;
}

export interface ScaleRequest {
  nodeSet: string;
  count: number;
}

export interface UpgradeRequest {
  version: string;
}

export interface UpgradeProgress {
  desiredVersion: string;
  currentVersion: string;
  phase: string;
  observedGeneration: number;
  conditions: Condition[];
  done: boolean;
}

export interface IndexSummary {
  name: string;
  health: "green" | "yellow" | "red";
  status: "open" | "close";
  docsCount: number;
  storeSizeBytes: number;
  shards: number;
  replicas: number;
}

export interface CreateIndexRequest {
  name: string;
  shards?: number;
  replicas?: number;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

export class ControlPlaneApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ControlPlaneApiError";
  }
}
