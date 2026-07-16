/**
 * Base URLs for the backend's two HTTP surfaces (module-boundaries.md):
 *  - `public-api`: unauthenticated read endpoints (search, listing detail).
 *  - `agent-api`: authenticated write endpoints (create/edit/manage listings).
 *
 * The backend is being scaffolded in parallel (separate task), so these are
 * stubbed with local-dev defaults. Both are `NEXT_PUBLIC_` env vars because,
 * per the architecture, browsers call the API layer directly (no
 * server-side BFF hop) for both surfaces — see module-boundaries.md's
 * component diagram. Override via `.env.local` once the real backend base
 * URLs are known.
 */
export const apiConfig = {
  publicApiBaseUrl:
    process.env.NEXT_PUBLIC_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/public",
  agentApiBaseUrl:
    process.env.NEXT_PUBLIC_AGENT_API_BASE_URL ?? "http://localhost:8080/api/agent",
} as const;
