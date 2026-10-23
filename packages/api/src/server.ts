import { buildServer, createDeps } from "./app.js";
import { ConfigError, parseConfig } from "./config.js";

async function main(): Promise<void> {
  let config;
  try {
    config = parseConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  let deps;
  try {
    deps = createDeps(config);
  } catch (err) {
    console.error(
      `Failed to load Kubernetes config (KUBECONFIG=${config.kubeconfigPath ?? "<default>"}): ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
    return;
  }

  const app = buildServer(deps);

  try {
    await app.listen({ port: config.apiPort, host: "127.0.0.1" });
  } catch (err) {
    app.log.error(err);
    process.exitCode = 1;
  }

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main();
