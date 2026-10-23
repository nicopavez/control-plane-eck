import { describe, expect, it } from "vitest";
import { ApiHttpError } from "./errors.js";
import {
  buildEsHttpsAgent,
  mapCatIndexRow,
  normalizeIndexHealth,
  parseForwardingReadyLine,
  parseIntOr,
  toEsHttpError,
} from "./es-client.js";

describe("parseForwardingReadyLine", () => {
  it("extracts the local port once kubectl reports it is forwarding", () => {
    expect(parseForwardingReadyLine("Forwarding from 127.0.0.1:9201 -> 9200")).toBe(9201);
  });

  it("ignores the companion [::1] line", () => {
    expect(parseForwardingReadyLine("Forwarding from [::1]:9201 -> 9200")).toBeNull();
  });

  it("ignores unrelated output", () => {
    expect(parseForwardingReadyLine("Handling connection for 9201")).toBeNull();
  });
});

describe("buildEsHttpsAgent", () => {
  it("pins the given CA and skips only the hostname/SAN check", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n";
    const agent = buildEsHttpsAgent(pem);
    expect(agent.options.ca).toBe(pem);
    expect(typeof agent.options.checkServerIdentity).toBe("function");
    expect(agent.options.checkServerIdentity?.("localhost", {} as never)).toBeUndefined();
    expect(agent.options.rejectUnauthorized).not.toBe(false);
  });
});

describe("normalizeIndexHealth", () => {
  it.each([
    ["green", "green"],
    ["yellow", "yellow"],
    ["red", "red"],
  ] as const)("passes through %s", (input, expected) => {
    expect(normalizeIndexHealth(input)).toBe(expected);
  });

  it("defaults a closed index's missing health to red rather than inventing green", () => {
    expect(normalizeIndexHealth(null)).toBe("red");
  });
});

describe("parseIntOr", () => {
  it("parses a numeric string", () => {
    expect(parseIntOr("42", 0)).toBe(42);
  });

  it("falls back on null, undefined or empty string", () => {
    expect(parseIntOr(null, 7)).toBe(7);
    expect(parseIntOr(undefined, 7)).toBe(7);
    expect(parseIntOr("", 7)).toBe(7);
  });
});

describe("mapCatIndexRow", () => {
  it("maps a _cat/indices?format=json&bytes=b row to an IndexSummary", () => {
    const summary = mapCatIndexRow({
      health: "green",
      status: "open",
      index: "logs-2024",
      "docs.count": "1234",
      "store.size": "5678",
      pri: "1",
      rep: "1",
    });
    expect(summary).toEqual({
      name: "logs-2024",
      health: "green",
      status: "open",
      docsCount: 1234,
      storeSizeBytes: 5678,
      shards: 1,
      replicas: 1,
    });
  });
});

describe("toEsHttpError", () => {
  it("extracts type and reason from an Elasticsearch error body", () => {
    const err = toEsHttpError(404, { error: { type: "index_not_found_exception", reason: "no such index [foo]" } });
    expect(err).toBeInstanceOf(ApiHttpError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("index_not_found_exception");
    expect(err.message).toBe("no such index [foo]");
  });

  it("falls back to a generic message when the body isn't the usual ES error shape", () => {
    const err = toEsHttpError(500, "boom");
    expect(err.status).toBe(500);
    expect(err.code).toBe("elasticsearch_error");
  });
});
