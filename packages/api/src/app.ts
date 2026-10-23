import cors from "@fastify/cors";
import type { Credentials } from "@control-plane-eck/shared";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { z, ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { EsClient, EsPortForward } from "./es-client.js";
import { ApiHttpError } from "./errors.js";
import {
  buildScaleNodeSetPatch,
  buildVersionPatch,
  createK8sContext,
  getElasticsearchCR,
  getEsCaCertPem,
  getEsCredentials,
  patchElasticsearchSpec,
  type K8sContext,
} from "./k8s.js";
import { mapClusterStatus, mapUpgradeProgress } from "./mappers.js";

export interface AppDeps {
  config: AppConfig;
  k8sCtx: K8sContext;
  esClient: EsClient;
  portForward: EsPortForward;
}

/** Real wiring: a live KubeConfig-backed context and a port-forward-backed ES client. */
export function createDeps(config: AppConfig): AppDeps {
  const k8sCtx = createK8sContext(config);
  const portForward = new EsPortForward(config.esClusterName, config.esNamespace, config.esLocalPort, console);
  const esClient = new EsClient(k8sCtx, config.esClusterName, portForward);
  return { config, k8sCtx, esClient, portForward };
}

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const ScaleBodySchema = z.object({
  count: z.coerce.number().int().min(0, "count must be zero or a positive integer"),
});

const UpgradeBodySchema = z.object({
  version: z.string().trim().min(1, "version is required"),
});

const CreateIndexBodySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  shards: z.coerce.number().int().positive().optional(),
  replicas: z.coerce.number().int().min(0).optional(),
});

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

export function buildServer(deps: AppDeps): FastifyInstance {
  const { config, k8sCtx, esClient } = deps;

  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      // Belt-and-suspenders: Fastify's default access logging never
      // includes response bodies, but if anything ever logs a
      // credentials/cert-shaped object directly, redact it rather than
      // leak it.
      redact: {
        paths: ["req.headers.authorization", "password", "caCertPem", "*.password", "*.caCertPem"],
        censor: "[REDACTED]",
      },
    },
  });

  void fastify.register(cors, {
    origin(origin, callback) {
      if (!origin || LOCAL_ORIGIN_PATTERN.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"), false);
    },
  });

  fastify.get("/status", async () => {
    const cr = await getElasticsearchCR(k8sCtx, config.esClusterName);
    return mapClusterStatus(cr, config.esClusterName, config.esNamespace);
  });

  fastify.get("/credentials", async () => {
    const [{ username, password }, caCertPem] = await Promise.all([
      getEsCredentials(k8sCtx, config.esClusterName),
      getEsCaCertPem(k8sCtx, config.esClusterName),
    ]);
    const curlSnippet =
      `curl -u ${username}:${password} -k ` +
      `https://localhost:${config.esLocalPort}/_cluster/health?pretty`;
    const credentials: Credentials = { username, password, caCertPem, curlSnippet };
    return credentials;
  });

  fastify.post<{ Params: { name: string } }>("/nodesets/:name/scale", async (request) => {
    const { count } = ScaleBodySchema.parse(request.body);
    const cr = await getElasticsearchCR(k8sCtx, config.esClusterName);
    const patch = buildScaleNodeSetPatch(cr, request.params.name, count, config.esClusterName);
    const patched = await patchElasticsearchSpec(k8sCtx, config.esClusterName, patch);
    return mapClusterStatus(patched, config.esClusterName, config.esNamespace);
  });

  fastify.get("/version", async () => {
    const cr = await getElasticsearchCR(k8sCtx, config.esClusterName);
    return mapUpgradeProgress(cr);
  });

  fastify.post("/version", async (request) => {
    const { version } = UpgradeBodySchema.parse(request.body);
    const patched = await patchElasticsearchSpec(k8sCtx, config.esClusterName, buildVersionPatch(version));
    return mapUpgradeProgress(patched);
  });

  fastify.get("/indices", async () => {
    return esClient.listIndices();
  });

  fastify.post("/indices", async (request, reply) => {
    const body = CreateIndexBodySchema.parse(request.body);
    const summary = await esClient.createIndex(body);
    reply.status(201);
    return summary;
  });

  fastify.delete<{ Params: { name: string } }>("/indices/:name", async (request, reply) => {
    await esClient.deleteIndex(request.params.name);
    reply.status(204);
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiHttpError) {
      reply.status(error.status).send(error.toBody());
      return;
    }
    if (error instanceof ZodError) {
      reply.status(400).send({ error: "invalid_request", message: formatZodError(error) });
      return;
    }
    const fastifyError = error as FastifyError;
    if (typeof fastifyError.statusCode === "number" && fastifyError.statusCode < 500) {
      reply.status(fastifyError.statusCode).send({ error: "invalid_request", message: fastifyError.message });
      return;
    }
    request.log.error({ err: error }, "unhandled error");
    reply.status(500).send({ error: "internal_error", message: "An unexpected error occurred." });
  });

  fastify.addHook("onClose", (_instance, done) => {
    deps.portForward.stop();
    done();
  });

  return fastify;
}
