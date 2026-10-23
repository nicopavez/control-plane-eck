import { ControlPlaneApiError } from "@control-plane-eck/shared";

export interface ApiErrorInfo {
  title: string;
  detail: string;
}

function isConnectionRefused(err: Error): boolean {
  const cause = (err as { cause?: unknown }).cause;
  const causeMessage = cause instanceof Error ? cause.message : "";
  return (
    err.message.includes("fetch failed") ||
    err.message.includes("ECONNREFUSED") ||
    causeMessage.includes("ECONNREFUSED") ||
    causeMessage.includes("ENOTFOUND")
  );
}

/**
 * Turns whatever ControlPlaneClient threw into something renderable. Distinguishes
 * "the API answered with an error" from "the API never answered at all" so the UI
 * never just hangs or shows a raw stack trace.
 */
export function describeApiError(err: unknown, baseUrl: string): ApiErrorInfo {
  if (err instanceof ControlPlaneApiError) {
    return {
      title: `API error (${err.status})`,
      detail: `${err.body.error}: ${err.body.message}`,
    };
  }
  if (err instanceof Error) {
    if (isConnectionRefused(err)) {
      return {
        title: "Can't reach the API",
        detail: `No response from ${baseUrl}. Is the API running?`,
      };
    }
    return { title: "Unexpected error", detail: err.message };
  }
  return { title: "Unexpected error", detail: String(err) };
}
