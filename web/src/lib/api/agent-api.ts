import { createApiClient, type ApiRequestOptions } from "./client";
import { apiConfig } from "./config";

/**
 * Browser-safe client for the same-origin BFF proxy at `/api/agent/*`
 * (`app/api/agent/[...path]/route.ts`), which forwards to the real backend
 * `agent-api` with a server-attached bearer token (F0.2 — see
 * docs/architecture/ADR-0002's token-transport amendment and
 * module-boundaries.md). This client never attaches a token itself — the
 * `token` request option is server-only (see `client.ts`) and intentionally
 * omitted from this client's option type so passing one is a compile error.
 * Auth instead flows via the httpOnly session cookie, which the browser
 * attaches automatically; every request also sends `credentials:
 * "same-origin"` and the `X-Requested-With` header the proxy's CSRF check
 * requires for non-GET requests.
 *
 * A `401 { code: "NO_SESSION" }` response means the session is absent/
 * expired — callers should send the user back to `/login`. A `403
 * { code: "AGENT_NOT_APPROVED" }` response from a write call means the
 * signed-in agent's account is still pending approval (see
 * `isAgentNotApprovedError` in `agent-errors.ts`).
 *
 * ```ts
 * const me = await agentApiClient.get<AgentMe>("/me");
 * ```
 */
type BrowserApiRequestOptions = Omit<ApiRequestOptions, "token">;

const proxyClient = createApiClient(apiConfig.agentApiBasePath);

function withCsrfDefaults(options: BrowserApiRequestOptions = {}): ApiRequestOptions {
  return {
    ...options,
    credentials: options.credentials ?? "same-origin",
    headers: {
      "X-Requested-With": "xhr",
      ...options.headers,
    },
  };
}

export const agentApiClient = {
  get: <T>(path: string, options?: BrowserApiRequestOptions) =>
    proxyClient.get<T>(path, withCsrfDefaults(options)),
  post: <T>(path: string, body?: unknown, options?: BrowserApiRequestOptions) =>
    proxyClient.post<T>(path, body, withCsrfDefaults(options)),
  put: <T>(path: string, body?: unknown, options?: BrowserApiRequestOptions) =>
    proxyClient.put<T>(path, body, withCsrfDefaults(options)),
  patch: <T>(path: string, body?: unknown, options?: BrowserApiRequestOptions) =>
    proxyClient.patch<T>(path, body, withCsrfDefaults(options)),
  delete: <T>(path: string, options?: BrowserApiRequestOptions) =>
    proxyClient.delete<T>(path, withCsrfDefaults(options)),
};
