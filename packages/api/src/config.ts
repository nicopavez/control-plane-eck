import os from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Side effect: reads .env (if present) into process.env. Safe to call
// more than once; dotenv never overrides a variable already set.
loadDotenv();

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const DEFAULT_API_PORT = 4000;
const DEFAULT_LOG_LEVEL: LogLevel = "info";
// Distinct from Elasticsearch's own 9200, so a local `kubectl
// port-forward` we spawn never collides with a port the operator (or ES
// itself, if ever run locally) is already using.
export const DEFAULT_ES_LOCAL_PORT = 9201;

// ES_NAMESPACE and ES_CLUSTER_NAME decide which cluster's Elasticsearch
// resource and Secrets this process reads and patches, so they are
// required: we never want to silently fall back and point this API at
// the wrong namespace or cluster.
const EnvSchema = z.object({
  KUBECONFIG: z.string().trim().min(1, "KUBECONFIG must not be empty when set").optional(),
  ES_NAMESPACE: z
    .string({ error: "ES_NAMESPACE is required (the namespace the Elasticsearch resource lives in)" })
    .trim()
    .min(1, "ES_NAMESPACE is required (the namespace the Elasticsearch resource lives in)"),
  ES_CLUSTER_NAME: z
    .string({ error: "ES_CLUSTER_NAME is required (the Elasticsearch resource's metadata.name)" })
    .trim()
    .min(1, "ES_CLUSTER_NAME is required (the Elasticsearch resource's metadata.name)"),
  API_PORT: z.coerce
    .number({ error: "API_PORT must be a number" })
    .int("API_PORT must be an integer")
    .min(1)
    .max(65535)
    .default(DEFAULT_API_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  ES_LOCAL_PORT: z.coerce
    .number({ error: "ES_LOCAL_PORT must be a number" })
    .int("ES_LOCAL_PORT must be an integer")
    .min(1)
    .max(65535)
    .default(DEFAULT_ES_LOCAL_PORT),
});

export interface AppConfig {
  /** Absolute path to a kubeconfig file, or undefined to use the client's own default resolution. */
  kubeconfigPath: string | undefined;
  esNamespace: string;
  esClusterName: string;
  apiPort: number;
  logLevel: LogLevel;
  /** Local port used for `kubectl port-forward` to the ES HTTP service. */
  esLocalPort: number;
}

export class ConfigError extends Error {}

/** Expands a leading `~` the way a shell would; dotenv/process.env never does this for us. */
export function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

/**
 * Parses and validates process.env into an `AppConfig`, failing fast with
 * every problem listed at once (not just the first) so a misconfigured
 * environment can be fixed in one pass.
 */
export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(unknown)"}: ${issue.message}`)
      .join("\n");
    throw new ConfigError(
      `Invalid or missing environment configuration:\n${details}\n` +
        "Copy .env.example to .env and fill in real values.",
    );
  }

  const parsed = result.data;
  return {
    kubeconfigPath: parsed.KUBECONFIG ? expandHome(parsed.KUBECONFIG) : undefined,
    esNamespace: parsed.ES_NAMESPACE,
    esClusterName: parsed.ES_CLUSTER_NAME,
    apiPort: parsed.API_PORT,
    logLevel: parsed.LOG_LEVEL,
    esLocalPort: parsed.ES_LOCAL_PORT,
  };
}
