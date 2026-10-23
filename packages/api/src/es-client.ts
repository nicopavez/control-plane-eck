import type { ChildProcessByStdio } from "node:child_process";
import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import https from "node:https";
import type { CreateIndexRequest, IndexSummary } from "@control-plane-eck/shared";
import { ApiHttpError } from "./errors.js";
import { getEsCaCertPem, getEsCredentials, type K8sContext } from "./k8s.js";

const PORT_FORWARD_TIMEOUT_MS = 10_000;
const FORWARDING_READY_PATTERN = /^Forwarding from 127\.0\.0\.1:(\d+)/;

/** Pure so it's easy to unit test without spawning a real process. */
export function parseForwardingReadyLine(line: string): number | null {
  const match = FORWARDING_READY_PATTERN.exec(line.trim());
  if (!match) return null;
  return Number(match[1]);
}

interface MinimalLogger {
  warn: (obj: unknown, msg?: string) => void;
}

type PortForwardChild = ChildProcessByStdio<null, Readable, Readable>;

interface RunningForward {
  child: PortForwardChild;
  ready: Promise<number>;
}

/**
 * Lazily spawns and supervises `kubectl port-forward svc/<cluster>-es-http
 * <localPort>:9200 -n <namespace>`, so plain /status and /credentials
 * requests never need it and never pay its cost or risk of failure. If
 * the forwarded process dies later, the next Elasticsearch request
 * restarts it instead of taking down the whole API.
 */
export class EsPortForward {
  private running: RunningForward | null = null;

  constructor(
    private readonly clusterName: string,
    private readonly namespace: string,
    private readonly localPort: number,
    private readonly logger: MinimalLogger,
  ) {}

  async ensure(): Promise<number> {
    if (!this.running) {
      this.running = this.spawnForward();
    }
    try {
      return await this.running.ready;
    } catch (err) {
      this.running = null;
      throw err;
    }
  }

  stop(): void {
    this.running?.child.kill();
    this.running = null;
  }

  private spawnForward(): RunningForward {
    const service = `svc/${this.clusterName}-es-http`;
    const args = ["port-forward", service, `${this.localPort}:9200`, "-n", this.namespace];
    const child = spawn("kubectl", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderrTail = "";
    let settle: ((result: { port: number } | { error: ApiHttpError }) => void) | null = null;

    const ready = new Promise<number>((resolve, reject) => {
      let settled = false;
      settle = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if ("port" in result) resolve(result.port);
        else reject(result.error);
      };

      const timeout = setTimeout(() => {
        child.kill();
        settle?.({
          error: new ApiHttpError(
            502,
            "port_forward_timeout",
            `Timed out waiting for "kubectl ${args.join(" ")}" to report it was forwarding. ` +
              (stderrTail.trim() || "Check that kubectl is on PATH, KUBECONFIG is set, and the pod is running."),
          ),
        });
      }, PORT_FORWARD_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString("utf-8").split("\n")) {
          const port = parseForwardingReadyLine(line);
          if (port !== null) {
            settle?.({ port });
            return;
          }
        }
      });
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail += chunk.toString("utf-8");
    });

    child.once("error", (err) => {
      settle?.({ error: new ApiHttpError(502, "port_forward_failed", `Failed to start kubectl port-forward: ${err.message}`) });
    });

    child.once("exit", (code) => {
      if (this.running?.child === child) {
        this.running = null;
      }
      settle?.({
        error: new ApiHttpError(
          502,
          "port_forward_exited",
          `kubectl port-forward exited before it started forwarding (code ${code ?? "unknown"}). ${stderrTail.trim()}`,
        ),
      });
      this.logger.warn({ code, stderr: stderrTail.trim() }, "kubectl port-forward exited");
    });

    return { child, ready };
  }
}

export function buildEsHttpsAgent(caCertPem: string): https.Agent {
  return new https.Agent({
    ca: caCertPem,
    // We reach Elasticsearch through `kubectl port-forward` to
    // 127.0.0.1, but the certificate in <cluster>-es-http-certs-public
    // only has SANs for the in-cluster service DNS name (e.g.
    // <cluster>-es-http), never for localhost/127.0.0.1. The chain of
    // trust, expiry, etc. are still fully enforced by Node's TLS stack
    // via the `ca` option above; this only skips the hostname/SAN
    // comparison, which would otherwise fail purely because of where we
    // are connecting from, not because the certificate is untrustworthy.
    // Do NOT replace this with `rejectUnauthorized: false`, which would
    // also skip chain-of-trust validation.
    checkServerIdentity: () => undefined,
  });
}

interface CatIndicesRow {
  health: string | null;
  status: string;
  index: string;
  "docs.count": string | null;
  "store.size": string | null;
  pri: string;
  rep: string;
}

export function parseIntOr(value: string | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// Closed indices report no health from _cat/indices, and IndexSummary's
// health has no "unknown" option (unlike ClusterStatus.health). We
// deliberately surface "red" rather than invent a health we don't know,
// so a closed index draws attention instead of looking fine.
export function normalizeIndexHealth(health: string | null): IndexSummary["health"] {
  if (health === "green" || health === "yellow" || health === "red") return health;
  return "red";
}

export function mapCatIndexRow(row: CatIndicesRow): IndexSummary {
  return {
    name: row.index,
    health: normalizeIndexHealth(row.health),
    status: row.status === "close" ? "close" : "open",
    docsCount: parseIntOr(row["docs.count"], 0),
    storeSizeBytes: parseIntOr(row["store.size"], 0),
    shards: parseIntOr(row.pri, 0),
    replicas: parseIntOr(row.rep, 0),
  };
}

export function toEsHttpError(status: number, body: unknown): ApiHttpError {
  const esError = (body as { error?: { type?: string; reason?: string } | string } | undefined)?.error;
  let code = "elasticsearch_error";
  let message = `Elasticsearch request failed with status ${status}`;
  if (typeof esError === "string") {
    message = esError;
  } else if (esError) {
    code = esError.type ?? code;
    message = esError.reason ?? message;
  }
  return new ApiHttpError(status || 502, code, message);
}

const CAT_INDICES_FIELDS = "health,status,index,docs.count,store.size,pri,rep";

/** Raw REST calls against the Elasticsearch HTTP API, through the port-forward. */
export class EsClient {
  constructor(
    private readonly k8sCtx: K8sContext,
    private readonly clusterName: string,
    private readonly portForward: EsPortForward,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const port = await this.portForward.ensure();
    const [credentials, caCertPem] = await Promise.all([
      getEsCredentials(this.k8sCtx, this.clusterName),
      getEsCaCertPem(this.k8sCtx, this.clusterName),
    ]);
    const agent = buildEsHttpsAgent(caCertPem);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const authToken = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");

    return new Promise<T>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          agent,
          headers: {
            authorization: `Basic ${authToken}`,
            accept: "application/json",
            ...(payload
              ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }
              : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf-8");
            const status = res.statusCode ?? 0;
            let parsed: unknown;
            if (raw.length > 0) {
              try {
                parsed = JSON.parse(raw);
              } catch {
                parsed = raw;
              }
            }
            if (status >= 200 && status < 300) {
              resolve(parsed as T);
            } else {
              reject(toEsHttpError(status, parsed));
            }
          });
        },
      );
      req.on("error", (err) => {
        reject(
          new ApiHttpError(
            502,
            "elasticsearch_unreachable",
            `Could not reach Elasticsearch through the port-forward: ${err.message}`,
          ),
        );
      });
      if (payload) req.write(payload);
      req.end();
    });
  }

  async listIndices(): Promise<IndexSummary[]> {
    const rows = await this.request<CatIndicesRow[]>(
      "GET",
      `/_cat/indices?format=json&bytes=b&h=${CAT_INDICES_FIELDS}`,
    );
    return rows.map(mapCatIndexRow);
  }

  async createIndex(req: CreateIndexRequest): Promise<IndexSummary> {
    const settings: Record<string, number> = {};
    if (req.shards !== undefined) settings.number_of_shards = req.shards;
    if (req.replicas !== undefined) settings.number_of_replicas = req.replicas;
    const body = Object.keys(settings).length > 0 ? { settings } : {};
    await this.request("PUT", `/${encodeURIComponent(req.name)}`, body);

    const rows = await this.request<CatIndicesRow[]>(
      "GET",
      `/_cat/indices/${encodeURIComponent(req.name)}?format=json&bytes=b&h=${CAT_INDICES_FIELDS}`,
    );
    const row = rows[0];
    if (!row) {
      throw new ApiHttpError(
        502,
        "index_create_unverified",
        `Created index "${req.name}" but could not read it back from Elasticsearch.`,
      );
    }
    return mapCatIndexRow(row);
  }

  async deleteIndex(name: string): Promise<void> {
    await this.request<unknown>("DELETE", `/${encodeURIComponent(name)}`);
  }
}
