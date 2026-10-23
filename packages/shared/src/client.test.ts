import { test } from "node:test";
import assert from "node:assert/strict";
import { ControlPlaneClient } from "./client.js";
import { ControlPlaneApiError } from "./types.js";

function fakeFetch(status: number, body: unknown = {}): typeof fetch {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: async () => body,
    }) as Response) as typeof fetch;
}

test("deleteIndex resolves without parsing a body on 204", async () => {
  const client = new ControlPlaneClient({
    baseUrl: "http://localhost:4000",
    fetchImpl: fakeFetch(204),
  });
  await assert.doesNotReject(client.deleteIndex("logs-2024"));
});

test("a non-2xx response throws ControlPlaneApiError with the server's error body", async () => {
  const client = new ControlPlaneClient({
    baseUrl: "http://localhost:4000",
    fetchImpl: fakeFetch(404, { error: "not_found", message: "no such index" }),
  });
  await assert.rejects(client.deleteIndex("missing"), (err: unknown) => {
    assert.ok(err instanceof ControlPlaneApiError);
    assert.equal(err.status, 404);
    assert.equal(err.body.message, "no such index");
    return true;
  });
});
