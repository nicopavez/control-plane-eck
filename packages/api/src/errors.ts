import type { ApiErrorBody } from "@control-plane-eck/shared";

/**
 * Any error that should reach the HTTP client as `ApiErrorBody` with a
 * specific status code. Route handlers can let this propagate; the
 * Fastify error handler in app.ts turns it into the response.
 */
export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }

  toBody(): ApiErrorBody {
    return { error: this.code, message: this.message };
  }
}
