import { describe, expect, it, vi } from "vitest";

const loadFromFile = vi.fn();
const loadFromDefault = vi.fn();
const makeApiClient = vi.fn((ctor: unknown) => ({ ctor }));

vi.mock("@kubernetes/client-node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@kubernetes/client-node")>();
  return {
    ...actual,
    KubeConfig: vi.fn().mockImplementation(() => ({
      loadFromFile,
      loadFromDefault,
      makeApiClient,
    })),
  };
});

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
