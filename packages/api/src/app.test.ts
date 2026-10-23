import { ApiException } from "@kubernetes/client-node";
import type { ClusterStatus, Credentials, IndexSummary } from "@control-plane-eck/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDeps } from "./app.js";
import { buildServer } from "./app.js";
import type { AppConfig } from "./config.js";
import type { EsClient, EsPortForward } from "./es-client.js";
import type { ElasticsearchCR, K8sContext } from "./k8s.js";

const CONFIG: AppConfig = {
  kubeconfigPath: undefined,
  esNamespace: "default",
  esClusterName: "quickstart",
  apiPort: 4000,
  logLevel: "silent" as AppConfig["logLevel"],
  esLocalPort: 9201,
};

const SAMPLE_CR: ElasticsearchCR = {
  metadata: { name: "quickstart", namespace: "default", generation: 1 },
  spec: { version: "8.15.0", nodeSets: [{ name: "default", count: 3 }] },
  status: { phase: "Ready", health: "green", availableNodes: 3, version: "8.15.0", observedGeneration: 1 },
};

function fakeK8sCtx(): K8sContext {
  return {
    customObjects: {
      getNamespacedCustomObject: vi.fn(),
      patchNamespacedCustomObject: vi.fn(),
    },
    coreV1: {
      readNamespacedSecret: vi.fn(),
    },
    namespace: "default",
  };
}

function fakeEsClient(): EsClient {
  return {
    listIndices: vi.fn(),
    createIndex: vi.fn(),
    deleteIndex: vi.fn(),
  } as unknown as EsClient;
}

function fakePortForward(): EsPortForward {
  return { ensure: vi.fn(), stop: vi.fn() } as unknown as EsPortForward;
}

function buildTestServer(overrides: Partial<AppDeps> = {}): { app: FastifyInstance; deps: AppDeps } {
  const deps: AppDeps = {
    config: CONFIG,
    k8sCtx: fakeK8sCtx(),
    esClient: fakeEsClient(),
    portForward: fakePortForward(),
    ...overrides,
  };
  return { app: buildServer(deps), deps };
}

describe("GET /status", () => {
  it("maps a healthy Elasticsearch CR to ClusterStatus", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockResolvedValue(SAMPLE_CR);

    const res = await app.inject({ method: "GET", url: "/status" });

    expect(res.statusCode).toBe(200);
    const body = res.json<ClusterStatus>();
    expect(body).toEqual({
      name: "quickstart",
      namespace: "default",
      phase: "Ready",
      health: "green",
      version: "8.15.0",
      availableNodes: 3,
      nodeSets: [{ name: "default", desiredCount: 3, readyCount: 3, roles: [] }],
      conditions: [],
      observedGeneration: 1,
    });
  });

  it("surfaces a k8s 404 as a 404 with the ApiErrorBody shape", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockRejectedValue(
      new ApiException(404, "Not Found", { message: "elasticsearches.elasticsearch.k8s.elastic.co \"quickstart\" not found" }, {}),
    );

    const res = await app.inject({ method: "GET", url: "/status" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "not_found" });
    expect(res.json().message).toContain("not found");
  });

  it("surfaces an unreachable k8s API as a 502, not a crash", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await app.inject({ method: "GET", url: "/status" });

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "kubernetes_unreachable" });
  });
});

describe("GET /credentials", () => {
  it("decodes the elastic-user secret and the CA cert, and builds a curl snippet", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.coreV1.readNamespacedSecret).mockImplementation(async ({ name }: { name: string }) => {
      if (name === "quickstart-es-elastic-user") {
        return { data: { elastic: Buffer.from("s3cr3t").toString("base64") } } as Awaited<
          ReturnType<K8sContext["coreV1"]["readNamespacedSecret"]>
        >;
      }
      if (name === "quickstart-es-http-certs-public") {
        return { data: { "tls.crt": Buffer.from("PEM-CONTENT").toString("base64") } } as Awaited<
          ReturnType<K8sContext["coreV1"]["readNamespacedSecret"]>
        >;
      }
      throw new Error(`unexpected secret ${name}`);
    });

    const res = await app.inject({ method: "GET", url: "/credentials" });

    expect(res.statusCode).toBe(200);
    const body = res.json<Credentials>();
    expect(body.username).toBe("elastic");
    expect(body.password).toBe("s3cr3t");
    expect(body.caCertPem).toBe("PEM-CONTENT");
    expect(body.curlSnippet).toContain("s3cr3t");
    expect(body.curlSnippet).toContain("9201");
  });
});

describe("POST /nodesets/:name/scale", () => {
  it("patches the matching nodeSet's count and returns the updated ClusterStatus", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockResolvedValue({
      metadata: { name: "quickstart", namespace: "default", generation: 1 },
      spec: {
        version: "8.15.0",
        nodeSets: [
          { name: "master", count: 3 },
          { name: "data", count: 5 },
        ],
      },
      status: { phase: "Ready", health: "green", availableNodes: 8, version: "8.15.0", observedGeneration: 1 },
    } satisfies ElasticsearchCR);
    vi.mocked(deps.k8sCtx.customObjects.patchNamespacedCustomObject).mockResolvedValue({
      metadata: { name: "quickstart", namespace: "default", generation: 2 },
      spec: {
        version: "8.15.0",
        nodeSets: [
          { name: "master", count: 3 },
          { name: "data", count: 7 },
        ],
      },
      status: { phase: "ApplyingChanges", health: "yellow", availableNodes: 8, version: "8.15.0", observedGeneration: 1 },
    } satisfies ElasticsearchCR);

    const res = await app.inject({ method: "POST", url: "/nodesets/data/scale", payload: { count: 7 } });

    expect(res.statusCode).toBe(200);
    expect(deps.k8sCtx.customObjects.patchNamespacedCustomObject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "quickstart",
        body: [{ op: "replace", path: "/spec/nodeSets/1/count", value: 7 }],
      }),
    );
    const body = res.json<ClusterStatus>();
    expect(body.nodeSets.find((ns) => ns.name === "data")?.desiredCount).toBe(7);
  });

  it("returns 404 when the nodeSet doesn't exist, without ever patching", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockResolvedValue(SAMPLE_CR);

    const res = await app.inject({ method: "POST", url: "/nodesets/missing/scale", payload: { count: 2 } });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "nodeset_not_found" });
    expect(deps.k8sCtx.customObjects.patchNamespacedCustomObject).not.toHaveBeenCalled();
  });

  it("rejects a negative count with a 400 before touching Kubernetes", async () => {
    const { app, deps } = buildTestServer();

    const res = await app.inject({ method: "POST", url: "/nodesets/default/scale", payload: { count: -1 } });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
    expect(deps.k8sCtx.customObjects.getNamespacedCustomObject).not.toHaveBeenCalled();
  });
});

describe("GET /version and POST /version", () => {
  it("GET /version maps the CR to UpgradeProgress", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.getNamespacedCustomObject).mockResolvedValue(SAMPLE_CR);

    const res = await app.inject({ method: "GET", url: "/version" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ desiredVersion: "8.15.0", currentVersion: "8.15.0", done: true });
  });

  it("POST /version patches spec.version", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.k8sCtx.customObjects.patchNamespacedCustomObject).mockResolvedValue({
      ...SAMPLE_CR,
      spec: { ...SAMPLE_CR.spec, version: "8.16.0" },
      status: { ...SAMPLE_CR.status, phase: "ApplyingChanges" },
    });

    const res = await app.inject({ method: "POST", url: "/version", payload: { version: "8.16.0" } });

    expect(res.statusCode).toBe(200);
    expect(deps.k8sCtx.customObjects.patchNamespacedCustomObject).toHaveBeenCalledWith(
      expect.objectContaining({ body: [{ op: "replace", path: "/spec/version", value: "8.16.0" }] }),
    );
  });
});

describe("indices routes", () => {
  it("GET /indices returns whatever the ES client reports", async () => {
    const { app, deps } = buildTestServer();
    const indices: IndexSummary[] = [
      { name: "logs", health: "green", status: "open", docsCount: 10, storeSizeBytes: 1000, shards: 1, replicas: 1 },
    ];
    vi.mocked(deps.esClient.listIndices).mockResolvedValue(indices);

    const res = await app.inject({ method: "GET", url: "/indices" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(indices);
  });

  it("POST /indices creates an index and returns 201 with its summary", async () => {
    const { app, deps } = buildTestServer();
    const summary: IndexSummary = {
      name: "new-index",
      health: "green",
      status: "open",
      docsCount: 0,
      storeSizeBytes: 0,
      shards: 1,
      replicas: 1,
    };
    vi.mocked(deps.esClient.createIndex).mockResolvedValue(summary);

    const res = await app.inject({ method: "POST", url: "/indices", payload: { name: "new-index" } });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(summary);
    expect(deps.esClient.createIndex).toHaveBeenCalledWith({ name: "new-index" });
  });

  it("POST /indices rejects a missing name with a 400", async () => {
    const { app } = buildTestServer();

    const res = await app.inject({ method: "POST", url: "/indices", payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
  });

  it("DELETE /indices/:name returns 204 with no body", async () => {
    const { app, deps } = buildTestServer();
    vi.mocked(deps.esClient.deleteIndex).mockResolvedValue(undefined);

    const res = await app.inject({ method: "DELETE", url: "/indices/logs" });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(deps.esClient.deleteIndex).toHaveBeenCalledWith("logs");
  });

  it("maps an Elasticsearch 404 (e.g. deleting a missing index) to a 404 ApiErrorBody", async () => {
    const { app, deps } = buildTestServer();
    const { ApiHttpError } = await import("./errors.js");
    vi.mocked(deps.esClient.deleteIndex).mockRejectedValue(
      new ApiHttpError(404, "index_not_found_exception", "no such index [missing]"),
    );

    const res = await app.inject({ method: "DELETE", url: "/indices/missing" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "index_not_found_exception", message: "no such index [missing]" });
  });
});

describe("CORS", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    ({ app } = buildTestServer());
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows a localhost origin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/status",
      headers: { origin: "http://localhost:3000" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("rejects an arbitrary remote origin", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/status",
      headers: {
        origin: "https://evil.example.com",
        "access-control-request-method": "GET",
      },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
