import "server-only";
import { createApiClient, type ApiRequestOptions } from "./client";
import { isAgentApiMockEnabled, agentApiServerBaseUrl } from "./server-config";
import { getDevMockAgentMe } from "./agent-me-dev-mock";

/**
 * Server-only client for calling the backend `agent-api` directly —
 * bypassing the same-origin BFF hop — for Server Components / Route
 * Handlers that already run on the server and hold the session (e.g.
 * `app/agent/layout.tsx` fetching the signed-in agent's profile). Pulls its
 * bearer token from a caller-supplied, already-fresh access token (see
 * `lib/auth/session.ts`'s `refreshSessionIfNeeded`); never import this from
 * a Client Component — the `server-only` guard fails the build if you do.
 *
 * ```ts
 * const session = await getSessionForServerComponent();
 * if (session) {
 *   const client = createAuthorizedAgentApiClient(session.accessToken);
 *   const me = await client.get<AgentMe>("/me");
 * }
 * ```
 */
type AuthorizedApiRequestOptions = Omit<ApiRequestOptions, "token">;

const rawClient = createApiClient(agentApiServerBaseUrl);

export interface AuthorizedAgentApiClient {
  get: <T>(path: string, options?: AuthorizedApiRequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: AuthorizedApiRequestOptions) => Promise<T>;
  put: <T>(path: string, body?: unknown, options?: AuthorizedApiRequestOptions) => Promise<T>;
  patch: <T>(path: string, body?: unknown, options?: AuthorizedApiRequestOptions) => Promise<T>;
  delete: <T>(path: string, options?: AuthorizedApiRequestOptions) => Promise<T>;
}

export function createAuthorizedAgentApiClient(accessToken: string): AuthorizedAgentApiClient {
  return {
    get: <T>(path: string, options?: AuthorizedApiRequestOptions) => {
      // Same dev-mock short-circuit as the BFF proxy route (`AGENT_API_MOCK`)
      // so `/me` behaves consistently whether it's reached through the
      // proxy (browser) or this direct server-to-server path (Server
      // Components, e.g. `app/agent/layout.tsx`) — otherwise local dev
      // without a real backend running would silently fail this path only.
      if (isAgentApiMockEnabled() && path === "/me") {
        return Promise.resolve(getDevMockAgentMe() as T);
      }
      return rawClient.get<T>(path, { ...options, token: accessToken });
    },
    post: (path, body, options) => rawClient.post(path, body, { ...options, token: accessToken }),
    put: (path, body, options) => rawClient.put(path, body, { ...options, token: accessToken }),
    patch: (path, body, options) => rawClient.patch(path, body, { ...options, token: accessToken }),
    delete: (path, options) => rawClient.delete(path, { ...options, token: accessToken }),
  };
}
