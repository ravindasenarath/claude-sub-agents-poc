/**
 * Base URLs/paths for the backend's two HTTP surfaces (module-boundaries.md):
 *  - `public-api`: unauthenticated read endpoints (search, listing detail).
 *    Browsers call this directly — unaffected by F0.2's auth work.
 *  - `agent-api`: authenticated write endpoints (create/edit/manage
 *    listings). As of F0.2, the browser never calls this origin directly:
 *    the Next server is a same-origin BFF proxy for all `agent-api` traffic
 *    (see docs/architecture/ADR-0002's token-transport amendment). The
 *    real backend origin therefore must NOT be a `NEXT_PUBLIC_` var (that
 *    would inline it into the client bundle and invite bypassing the
 *    proxy) — see `server-config.ts` for the server-only base URL used by
 *    the proxy route itself.
 */
export const apiConfig = {
  publicApiBaseUrl:
    process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/public",
  /**
   * Browser-facing "agent API base" — always this same-origin, relative
   * path. Never the real backend origin.
   */
  agentApiBasePath: "/api/agent",
} as const;
