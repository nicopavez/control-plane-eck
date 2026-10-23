import { ApiException } from "@kubernetes/client-node";
import { describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "./errors.js";
import {
  buildScaleNodeSetPatch,
  buildVersionPatch,
  getElasticsearchCR,
  getEsCaCertPem,
  getEsCredentials,
  patchElasticsearchSpec,
  type ElasticsearchCR,
  type K8sContext,
} from "./k8s.js";

function fakeContext(overrides: Partial<K8sContext> = {}): K8sContext {
  return {
    customObjects: {
      getNamespacedCustomObject: vi.fn(),
      patchNamespacedCustomObject: vi.fn(),
    },
    coreV1: {
      readNamespacedSecret: vi.fn(),
    },
    namespace: "default",
    ...overrides,
  };
}

const SAMPLE_CR: ElasticsearchCR = {
  metadata: { name: "quickstart", namespace: "default", generation: 1 },
  spec: { version: "8.15.0", nodeSets: [{ name: "default", count: 3 }] },
  status: { phase: "Ready", health: "green", availableNodes: 3, version: "8.15.0", observedGeneration: 1 },
};

describe("getElasticsearchCR", () => {
  it("fetches the Elasticsearch custom resource with the right coordinates", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.customObjects.getNamespacedCustomObject).mockResolvedValue(SAMPLE_CR);

    const cr = await getElasticsearchCR(ctx, "quickstart");

    expect(cr).toEqual(SAMPLE_CR);
    expect(ctx.customObjects.getNamespacedCustomObject).toHaveBeenCalledWith({
      group: "elasticsearch.k8s.elastic.co",
      version: "v1",
      namespace: "default",
      plural: "elasticsearches",
      name: "quickstart",
    });
  });

  it("maps a 404 ApiException to a 404 ApiHttpError", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.customObjects.getNamespacedCustomObject).mockRejectedValue(
      new ApiException(404, "Not Found", { message: 'elasticsearches.elasticsearch.k8s.elastic.co "quickstart" not found' }, {}),
    );

    await expect(getElasticsearchCR(ctx, "quickstart")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });

  it("maps a connection failure (no ApiException) to a 502", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.customObjects.getNamespacedCustomObject).mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getElasticsearchCR(ctx, "quickstart")).rejects.toMatchObject({
      status: 502,
      code: "kubernetes_unreachable",
    });
  });
});

describe("patchElasticsearchSpec", () => {
  it("sends the given JSON Patch ops to the right resource", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.customObjects.patchNamespacedCustomObject).mockResolvedValue(SAMPLE_CR);
    const ops = buildVersionPatch("8.16.0");

    await patchElasticsearchSpec(ctx, "quickstart", ops);

    expect(ctx.customObjects.patchNamespacedCustomObject).toHaveBeenCalledWith({
      group: "elasticsearch.k8s.elastic.co",
      version: "v1",
      namespace: "default",
      plural: "elasticsearches",
      name: "quickstart",
      body: ops,
    });
  });
});

describe("buildScaleNodeSetPatch", () => {
  it("builds a replace op at the matching nodeSet's index", () => {
    const cr: ElasticsearchCR = {
      spec: {
        version: "8.15.0",
        nodeSets: [
          { name: "master", count: 3 },
          { name: "data", count: 5 },
        ],
      },
    };
    expect(buildScaleNodeSetPatch(cr, "data", 7, "quickstart")).toEqual([
      { op: "replace", path: "/spec/nodeSets/1/count", value: 7 },
    ]);
  });

  it("throws a 404 ApiHttpError when the nodeSet doesn't exist", () => {
    const cr: ElasticsearchCR = { spec: { version: "8.15.0", nodeSets: [{ name: "default", count: 3 }] } };
    expect(() => buildScaleNodeSetPatch(cr, "missing", 1, "quickstart")).toThrow(ApiHttpError);
    try {
      buildScaleNodeSetPatch(cr, "missing", 1, "quickstart");
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiHttpError);
      expect((err as ApiHttpError).status).toBe(404);
      expect((err as ApiHttpError).code).toBe("nodeset_not_found");
    }
  });
});

describe("getEsCredentials", () => {
  it("reads <cluster>-es-elastic-user and base64-decodes the elastic key", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.coreV1.readNamespacedSecret).mockResolvedValue({
      data: { elastic: Buffer.from("s3cr3t").toString("base64") },
    });

    const credentials = await getEsCredentials(ctx, "quickstart");

    expect(credentials).toEqual({ username: "elastic", password: "s3cr3t" });
    expect(ctx.coreV1.readNamespacedSecret).toHaveBeenCalledWith({
      name: "quickstart-es-elastic-user",
      namespace: "default",
    });
  });

  it("raises a clear 502 when the secret is missing the expected key", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.coreV1.readNamespacedSecret).mockResolvedValue({ data: {} });

    await expect(getEsCredentials(ctx, "quickstart")).rejects.toMatchObject({
      status: 502,
      code: "secret_missing_key",
    });
  });

  it("maps a missing secret to a 404", async () => {
    const ctx = fakeContext();
    vi.mocked(ctx.coreV1.readNamespacedSecret).mockRejectedValue(new ApiException(404, "Not Found", { message: "not found" }, {}));

    await expect(getEsCredentials(ctx, "quickstart")).rejects.toMatchObject({ status: 404, code: "not_found" });
  });
});

describe("getEsCaCertPem", () => {
  it("reads <cluster>-es-http-certs-public and base64-decodes tls.crt", async () => {
    const ctx = fakeContext();
    const pem = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n";
    vi.mocked(ctx.coreV1.readNamespacedSecret).mockResolvedValue({
      data: { "tls.crt": Buffer.from(pem).toString("base64") },
    });

    const caCertPem = await getEsCaCertPem(ctx, "quickstart");

    expect(caCertPem).toBe(pem);
    expect(ctx.coreV1.readNamespacedSecret).toHaveBeenCalledWith({
      name: "quickstart-es-http-certs-public",
      namespace: "default",
    });
  });
});
