import "dotenv/config";
import { ControlPlaneClient } from "@control-plane-eck/shared";

const DEFAULT_BASE_URL = "http://localhost:4000";

/** The API base URL the TUI talks to, from API_BASE_URL (see .env.example) or the default. */
export function getApiBaseUrl(): string {
  const configured = process.env.API_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
}

/** Builds the one typed client every screen shares. No HTTP happens here. */
export function createClient(): ControlPlaneClient {
  return new ControlPlaneClient({ baseUrl: getApiBaseUrl() });
}
