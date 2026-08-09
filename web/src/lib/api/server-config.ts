import "server-only";

/**
 * The real `agent-api` backend origin. Server-only by design (F0.2): the
 * only code allowed to read this is the BFF proxy route
 * (`app/api/agent/[...path]/route.ts`) and the server-only agent-api client
 * (`agent-api.server.ts`) used by Server Components that call the backend
 * directly. Never import this from anything that can end up in a client
 * bundle — use `apiConfig.agentApiBasePath` (`/api/agent`) from `config.ts`
 * for browser-facing code instead.
 */
export const agentApiServerBaseUrl = process.env.AGENT_API_BASE_URL ?? "http://localhost:8080/api/agent";

/**
 * When set, the BFF proxy serves a canned `GET /api/agent/me` response
 * instead of forwarding to `agentApiServerBaseUrl` — useful for local
 * frontend dev and this task's tests, since the real `agent-api` (B0.2a/
 * B0.2b) hasn't landed yet. Never enable in production.
 *
 * A function (not a module-load-time constant) so it reflects the current
 * env var on every call — tests toggle `process.env.AGENT_API_MOCK` between
 * cases without needing to re-import the module.
 */
export function isAgentApiMockEnabled(): boolean {
  return process.env.AGENT_API_MOCK === "true";
}
