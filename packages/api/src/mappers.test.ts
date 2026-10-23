import { describe, expect, it } from "vitest";
import type { ElasticsearchCR } from "./k8s.js";
import { mapClusterStatus, mapUpgradeProgress } from "./mappers.js";

function baseCR(overrides: Partial<ElasticsearchCR> = {}): ElasticsearchCR {
  return {
    metadata: { name: "quickstart", namespace: "default", generation: 2 },
    spec: {
      version: "8.15.0",
      nodeSets: [{ name: "default", count: 3, config: { node: { roles: ["master", "data"] } } }],
    },
    status: {
      phase: "Ready",
      health: "green",
      availableNodes: 3,
      version: "8.15.0",
      observedGeneration: 2,
      conditions: undefined,
    },
    ...overrides,
  };
}

describe("mapClusterStatus", () => {
  it("maps a healthy, fully available CR", () => {
    const status = mapClusterStatus(baseCR(), "quickstart", "default");
    expect(status).toEqual({
      name: "quickstart",
      namespace: "default",
      phase: "Ready",
      health: "green",
      version: "8.15.0",
      availableNodes: 3,
      nodeSets: [{ name: "default", desiredCount: 3, readyCount: 3, roles: ["master", "data"] }],
      conditions: [],
      observedGeneration: 2,
    });
  });

  it("falls back to the configured name/namespace when metadata is missing", () => {
    const cr = baseCR({ metadata: undefined });
    const status = mapClusterStatus(cr, "fallback-name", "fallback-ns");
    expect(status.name).toBe("fallback-name");
    expect(status.namespace).toBe("fallback-ns");
  });

  it("normalizes an unrecognized health value to unknown", () => {
    const cr = baseCR();
    cr.status!.health = undefined;
    expect(mapClusterStatus(cr, "x", "y").health).toBe("unknown");
  });

  it("distributes available nodes across multiple nodeSets in spec order, capped at desired", () => {
    const cr = baseCR({
      spec: {
        version: "8.15.0",
        nodeSets: [
          { name: "master", count: 3 },
          { name: "data", count: 5 },
        ],
      },
      status: { phase: "Ready", health: "yellow", availableNodes: 6, version: "8.15.0", observedGeneration: 1 },
    });
    const status = mapClusterStatus(cr, "x", "y");
    expect(status.nodeSets).toEqual([
      { name: "master", desiredCount: 3, readyCount: 3, roles: [] },
      { name: "data", desiredCount: 5, readyCount: 3, roles: [] },
    ]);
  });

  it("maps conditions and normalizes an unrecognized status to Unknown", () => {
    const cr = baseCR();
    cr.status!.conditions = [
      { type: "ReconciliationComplete", status: "True", message: "ok", lastTransitionTime: "2024-01-01T00:00:00Z" },
      { type: "Weird", status: "Flaky" },
    ];
    const status = mapClusterStatus(cr, "x", "y");
    expect(status.conditions).toEqual([
      { type: "ReconciliationComplete", status: "True", message: "ok", lastTransitionTime: "2024-01-01T00:00:00Z" },
      { type: "Weird", status: "Unknown", message: undefined, lastTransitionTime: undefined },
    ]);
  });

  it("defaults availableNodes and observedGeneration to 0 when status is absent", () => {
    const cr = baseCR({ status: undefined });
    const status = mapClusterStatus(cr, "x", "y");
    expect(status.availableNodes).toBe(0);
    expect(status.observedGeneration).toBe(0);
    expect(status.phase).toBe("Unknown");
    expect(status.nodeSets[0]).toEqual({ name: "default", desiredCount: 3, readyCount: 0, roles: ["master", "data"] });
  });
});

describe("mapUpgradeProgress", () => {
  it("is done once the operator has observed the latest generation and reports Ready on the desired version", () => {
    const cr = baseCR();
    const progress = mapUpgradeProgress(cr);
    expect(progress).toEqual({
      desiredVersion: "8.15.0",
      currentVersion: "8.15.0",
      phase: "Ready",
      observedGeneration: 2,
      conditions: [],
      done: true,
    });
  });

  it("is not done while the operator hasn't caught up to the latest spec change", () => {
    const cr = baseCR({ metadata: { name: "quickstart", namespace: "default", generation: 3 } });
    expect(mapUpgradeProgress(cr).done).toBe(false);
  });

  it("is not done while the running version still differs from the desired version", () => {
    const cr = baseCR({ spec: { version: "8.16.0", nodeSets: [] } });
    const progress = mapUpgradeProgress(cr);
    expect(progress.desiredVersion).toBe("8.16.0");
    expect(progress.currentVersion).toBe("8.15.0");
    expect(progress.done).toBe(false);
  });

  it("is not done while the phase isn't Ready", () => {
    const cr = baseCR();
    cr.status!.phase = "ApplyingChanges";
    expect(mapUpgradeProgress(cr).done).toBe(false);
  });
});
