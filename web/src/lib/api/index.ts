export { createApiClient } from "./client";
export type { ApiClient, ApiRequestOptions, ApiQuery } from "./client";
export { ApiError } from "./errors";
export { apiConfig } from "./config";
export { publicApiClient } from "./public-api";
export { agentApiClient } from "./agent-api";
export { isAgentNotApprovedError } from "./agent-errors";
export type { AgentMe, AgentNotApprovedError } from "./agent-me";
export { AGENT_NOT_APPROVED_MESSAGE } from "./agent-me";

// Deliberately NOT re-exported from this barrel: `agent-api.server.ts`
// (`server-only`-guarded — importing it from a Client Component fails the
// build) and `server-config.ts`. Import those directly from
// `@/lib/api/agent-api.server` / `@/lib/api/server-config` in server-only
// code (Server Components, Route Handlers) instead.
