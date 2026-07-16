import { createApiClient } from "./client";
import { apiConfig } from "./config";

/**
 * Client bound to the backend's `agent-api` surface (authenticated write
 * endpoints — create/edit/manage listings; module-boundaries.md).
 *
 * Auth/session wiring (F0.2) hasn't landed yet, so this client does not
 * attach a bearer token automatically. Until then, callers must pass one
 * explicitly via the `token` request option, e.g.:
 *
 * ```ts
 * agentApiClient.get("/listings/mine", { token: currentAgentToken });
 * ```
 */
export const agentApiClient = createApiClient(apiConfig.agentApiBaseUrl);
