import {
  ClusterStatus,
  Credentials,
  ScaleRequest,
  UpgradeRequest,
  UpgradeProgress,
  IndexSummary,
  CreateIndexRequest,
  ApiErrorBody,
  ControlPlaneApiError,
} from "./types.js";

export interface ControlPlaneClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/**
 * Thin typed client over packages/api. The TUI, the web stub and the
 * presentation site all go through this so there is exactly one place
 * that knows the HTTP contract.
 */
export class ControlPlaneClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ControlPlaneClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({
        error: "unknown_error",
        message: res.statusText,
      }))) as ApiErrorBody;
      throw new ControlPlaneApiError(res.status, body);
    }
    // A 204 (e.g. deleteIndex, typed Promise<void>) has no body to parse.
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  getStatus(): Promise<ClusterStatus> {
    return this.request<ClusterStatus>("/status");
  }

  getCredentials(): Promise<Credentials> {
    return this.request<Credentials>("/credentials");
  }

  scaleNodeSet(req: ScaleRequest): Promise<ClusterStatus> {
    return this.request<ClusterStatus>(
      `/nodesets/${encodeURIComponent(req.nodeSet)}/scale`,
      { method: "POST", body: JSON.stringify({ count: req.count }) },
    );
  }

  upgrade(req: UpgradeRequest): Promise<UpgradeProgress> {
    return this.request<UpgradeProgress>("/version", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  getUpgradeProgress(): Promise<UpgradeProgress> {
    return this.request<UpgradeProgress>("/version");
  }

  listIndices(): Promise<IndexSummary[]> {
    return this.request<IndexSummary[]>("/indices");
  }

  createIndex(req: CreateIndexRequest): Promise<IndexSummary> {
    return this.request<IndexSummary>("/indices", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  deleteIndex(name: string): Promise<void> {
    return this.request<void>(`/indices/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }
}
