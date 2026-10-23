import { ApiException, CoreV1Api, CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";
import type { AppConfig } from "./config.js";
import { ApiHttpError } from "./errors.js";

export const ELASTICSEARCH_GROUP = "elasticsearch.k8s.elastic.co";
export const ELASTICSEARCH_VERSION = "v1";
export const ELASTICSEARCH_PLURAL = "elasticsearches";

/** The slice of the Elasticsearch CRD this service actually reads or patches. */
export interface ElasticsearchNodeSetSpec {
  name: string;
  count: number;
  config?: {
    node?: {
      roles?: string[];
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ElasticsearchCondition {
  type: string;
  status: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface ElasticsearchCR {
  metadata?: {
    name?: string;
    namespace?: string;
    generation?: number;
  };
  spec: {
    version: string;
    nodeSets: ElasticsearchNodeSetSpec[];
  };
  status?: {
    phase?: string;
    health?: string;
    availableNodes?: number;
    version?: string;
    observedGeneration?: number;
    conditions?: ElasticsearchCondition[];
  };
}

export interface JsonPatchOp {
  op: "add" | "replace" | "remove" | "test" | "copy" | "move";
  path: string;
  value?: unknown;
}

/** The two k8s clients this package needs, scoped to the methods it actually calls. */
export interface K8sContext {
  customObjects: Pick<CustomObjectsApi, "getNamespacedCustomObject" | "patchNamespacedCustomObject">;
  coreV1: Pick<CoreV1Api, "readNamespacedSecret">;
  namespace: string;
}

/**
 * Builds the real Kubernetes clients from the user's kubeconfig. Reading
 * and patching the Elasticsearch custom resource and reading Secrets goes
 * straight through the k8s API server (reachable via minikube), unlike
 * the Elasticsearch HTTP service itself, which needs a port-forward (see
 * es-client.ts).
 */
export function createK8sContext(config: AppConfig): K8sContext {
  const kubeConfig = new KubeConfig();
  if (config.kubeconfigPath) {
    kubeConfig.loadFromFile(config.kubeconfigPath);
  } else {
    kubeConfig.loadFromDefault();
  }
  return {
    customObjects: kubeConfig.makeApiClient(CustomObjectsApi),
    coreV1: kubeConfig.makeApiClient(CoreV1Api),
    namespace: config.esNamespace,
  };
}

/** Maps any failure from a k8s client call to the HTTP-shaped error our routes expect. */
function toApiHttpError(err: unknown, subject: string): ApiHttpError {
  if (err instanceof ApiHttpError) return err;
  if (err instanceof ApiException) {
    const status = err.code;
    const body = err.body as { message?: string; reason?: string } | undefined;
    const message = body?.message ?? `Request for ${subject} failed with status ${status}`;
    return new ApiHttpError(status, statusToErrorCode(status), message);
  }
  const message = err instanceof Error ? err.message : String(err);
  return new ApiHttpError(502, "kubernetes_unreachable", `Could not reach the Kubernetes API for ${subject}: ${message}`);
}

function statusToErrorCode(status: number): string {
  switch (status) {
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 401:
    case 403:
      return "forbidden";
    default:
      return "kubernetes_error";
  }
}

export async function getElasticsearchCR(ctx: K8sContext, clusterName: string): Promise<ElasticsearchCR> {
  try {
    const obj = await ctx.customObjects.getNamespacedCustomObject({
      group: ELASTICSEARCH_GROUP,
      version: ELASTICSEARCH_VERSION,
      namespace: ctx.namespace,
      plural: ELASTICSEARCH_PLURAL,
      name: clusterName,
    });
    return obj as ElasticsearchCR;
  } catch (err) {
    throw toApiHttpError(err, `Elasticsearch resource "${clusterName}" in namespace "${ctx.namespace}"`);
  }
}

export async function patchElasticsearchSpec(
  ctx: K8sContext,
  clusterName: string,
  ops: JsonPatchOp[],
): Promise<ElasticsearchCR> {
  try {
    const obj = await ctx.customObjects.patchNamespacedCustomObject({
      group: ELASTICSEARCH_GROUP,
      version: ELASTICSEARCH_VERSION,
      namespace: ctx.namespace,
      plural: ELASTICSEARCH_PLURAL,
      name: clusterName,
      body: ops,
    });
    return obj as ElasticsearchCR;
  } catch (err) {
    throw toApiHttpError(err, `Elasticsearch resource "${clusterName}" in namespace "${ctx.namespace}"`);
  }
}

/** Builds the JSON Patch that scales one nodeSet, or throws a 404 ApiHttpError if it doesn't exist. */
export function buildScaleNodeSetPatch(cr: ElasticsearchCR, nodeSetName: string, count: number, clusterName: string): JsonPatchOp[] {
  const index = (cr.spec.nodeSets ?? []).findIndex((ns) => ns.name === nodeSetName);
  if (index === -1) {
    throw new ApiHttpError(
      404,
      "nodeset_not_found",
      `NodeSet "${nodeSetName}" was not found on Elasticsearch resource "${clusterName}"`,
    );
  }
  return [{ op: "replace", path: `/spec/nodeSets/${index}/count`, value: count }];
}

export function buildVersionPatch(version: string): JsonPatchOp[] {
  return [{ op: "replace", path: "/spec/version", value: version }];
}

async function getSecretData(ctx: K8sContext, secretName: string): Promise<Record<string, string>> {
  try {
    const secret = await ctx.coreV1.readNamespacedSecret({ name: secretName, namespace: ctx.namespace });
    return secret.data ?? {};
  } catch (err) {
    throw toApiHttpError(err, `Secret "${secretName}" in namespace "${ctx.namespace}"`);
  }
}

function decodeSecretValue(data: Record<string, string>, key: string, secretName: string): string {
  const raw = data[key];
  if (raw === undefined) {
    throw new ApiHttpError(
      502,
      "secret_missing_key",
      `Secret "${secretName}" is missing the expected key "${key}"`,
    );
  }
  return Buffer.from(raw, "base64").toString("utf-8");
}

export interface EsCredentials {
  username: string;
  password: string;
}

/** Reads the `<cluster>-es-elastic-user` Secret and decodes the `elastic` user's password. */
export async function getEsCredentials(ctx: K8sContext, clusterName: string): Promise<EsCredentials> {
  const secretName = `${clusterName}-es-elastic-user`;
  const data = await getSecretData(ctx, secretName);
  return { username: "elastic", password: decodeSecretValue(data, "elastic", secretName) };
}

/** Reads the `<cluster>-es-http-certs-public` Secret and decodes the PEM CA/cert. */
export async function getEsCaCertPem(ctx: K8sContext, clusterName: string): Promise<string> {
  const secretName = `${clusterName}-es-http-certs-public`;
  const data = await getSecretData(ctx, secretName);
  return decodeSecretValue(data, "tls.crt", secretName);
}
