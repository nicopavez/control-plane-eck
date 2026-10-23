import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, DEFAULT_ES_LOCAL_PORT, expandHome, parseConfig } from "./config.js";

const BASE_ENV = {
  ES_NAMESPACE: "default",
  ES_CLUSTER_NAME: "quickstart",
};

describe("expandHome", () => {
  it("expands a bare ~", () => {
    expect(expandHome("~")).toBe(os.homedir());
  });

  it("expands ~/ prefixes", () => {
    expect(expandHome("~/.kube/config")).toBe(path.join(os.homedir(), ".kube/config"));
  });

  it("leaves absolute paths untouched", () => {
    expect(expandHome("/etc/kube/config")).toBe("/etc/kube/config");
  });
});

describe("parseConfig", () => {
  it("parses a fully specified environment", () => {
    const config = parseConfig({
      ...BASE_ENV,
      KUBECONFIG: "/etc/kube/config",
      API_PORT: "5000",
      LOG_LEVEL: "debug",
      ES_LOCAL_PORT: "9999",
    });
    expect(config).toEqual({
      kubeconfigPath: "/etc/kube/config",
      esNamespace: "default",
      esClusterName: "quickstart",
      apiPort: 5000,
      logLevel: "debug",
      esLocalPort: 9999,
    });
  });

  it("expands a tilde in KUBECONFIG", () => {
    const config = parseConfig({ ...BASE_ENV, KUBECONFIG: "~/.kube/config" });
    expect(config.kubeconfigPath).toBe(path.join(os.homedir(), ".kube/config"));
  });

  it("defaults API_PORT, LOG_LEVEL and ES_LOCAL_PORT when unset", () => {
    const config = parseConfig({ ...BASE_ENV });
    expect(config.apiPort).toBe(4000);
    expect(config.logLevel).toBe("info");
    expect(config.esLocalPort).toBe(DEFAULT_ES_LOCAL_PORT);
    expect(config.kubeconfigPath).toBeUndefined();
  });

  it("fails fast listing every missing required variable at once", () => {
    try {
      parseConfig({});
      throw new Error("expected parseConfig to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const message = (err as ConfigError).message;
      expect(message).toContain("ES_NAMESPACE");
      expect(message).toContain("ES_CLUSTER_NAME");
    }
  });

  it("rejects a non-numeric API_PORT with a clear message", () => {
    expect(() => parseConfig({ ...BASE_ENV, API_PORT: "not-a-number" })).toThrow(/API_PORT/);
  });

  it("rejects an unknown LOG_LEVEL", () => {
    expect(() => parseConfig({ ...BASE_ENV, LOG_LEVEL: "verbose" })).toThrow(ConfigError);
  });
});
