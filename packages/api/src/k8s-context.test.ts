import { describe, expect, it, vi } from "vitest";

const loadFromFile = vi.fn();
const loadFromDefault = vi.fn();
const makeApiClient = vi.fn((ctor: unknown) => ({ ctor }));

// Deliberately NOT using `importOriginal` + spread here: loading the real
// @kubernetes/client-node module (which pulls in undici's HTTP machinery)
// crashes under some Node versions with an unrelated vitest/undici mocking
// bug ("Cannot read properties of undefined (reading 'bind')" in
// interceptor/decompress.js). createK8sContext only ever passes
// CoreV1Api/CustomObjectsApi through to the (also mocked) makeApiClient as
// opaque constructor references, so plain stand-ins are enough here; a real
// ApiException is only needed by the error-mapping tests in k8s.test.ts.
vi.mock("@kubernetes/client-node", () => ({
  KubeConfig: vi.fn().mockImplementation(() => ({
    loadFromFile,
    loadFromDefault,
    makeApiClient,
  })),
  CoreV1Api: class CoreV1Api {},
  CustomObjectsApi: class CustomObjectsApi {},
  ApiException: class ApiException extends Error {},
}));

describe("createK8sContext", () => {
  it("loads the kubeconfig from the configured file when KUBECONFIG is set", async () => {
    const { createK8sContext } = await import("./k8s.js");
    createK8sContext({
      kubeconfigPath: "/etc/kube/config",
      esNamespace: "default",
      esClusterName: "quickstart",
      apiPort: 4000,
      logLevel: "info",
      esLocalPort: 9201,
    });

    expect(loadFromFile).toHaveBeenCalledWith("/etc/kube/config");
    expect(loadFromDefault).not.toHaveBeenCalled();
    expect(makeApiClient).toHaveBeenCalledTimes(2);
  });

  it("falls back to the client's own default resolution when KUBECONFIG is unset", async () => {
    vi.clearAllMocks();
    const { createK8sContext } = await import("./k8s.js");
    createK8sContext({
      kubeconfigPath: undefined,
      esNamespace: "default",
      esClusterName: "quickstart",
      apiPort: 4000,
      logLevel: "info",
      esLocalPort: 9201,
    });

    expect(loadFromDefault).toHaveBeenCalledTimes(1);
    expect(loadFromFile).not.toHaveBeenCalled();
  });
});
