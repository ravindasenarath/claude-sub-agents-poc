# Property Listing Platform — Web

Frontend app for the Property Listing Platform (v1). See
[`docs/architecture`](../docs/architecture) for the system architecture and
[`requirements.md`](../requirements.md) for product requirements.

## Stack

- **Next.js (App Router) + TypeScript** — chosen per ADR-0001, which calls for
  a server-rendered/hybrid-rendered responsive frontend so public listing and
  search pages are crawlable (NFR5). App Router Server Components render on
  the server by default, giving public pages real HTML on first response
  without extra config, while still supporting client-side interactivity
  where needed (filters, forms) and static generation for pages with no
  per-request data.
- **Tailwind CSS v4** for styling/responsive utilities, layered on a small
  set of design tokens (`src/app/globals.css`).
- **Vitest + React Testing Library** for unit/component tests.

## Getting started

```bash
npm install
cp .env.example .env.local   # point at your local backend, or use the defaults
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run test` (`test:watch` for watch mode).

## Project structure

```
src/
  app/
    layout.tsx           Root layout: <html>/<body>, fonts, base metadata only
    globals.css           Tailwind import + design tokens (colors, type scale, spacing)
    (public)/              Public (unauthenticated) surface — route group, no URL prefix
      layout.tsx           Public chrome: header + footer
      page.tsx              Placeholder home/browse page
    agent/                 Agent (authenticated) surface — real "/agent" URL prefix
      layout.tsx            Agent chrome: header/nav, fetches the signed-in agent's profile
      page.tsx               Placeholder agent dashboard
    login/                 Agent login page (F0.2)
    api/
      auth/                 login/callback/logout route handlers (OIDC)
      agent/[...path]/       BFF proxy route for all agent-api traffic (F0.2)
  components/
    auth/                   LoginForm (presentational)
    layout/                 Layout primitives: Container, Stack, surface headers/footer, LogoutButton, PendingApprovalBanner
    ui/                     Minimal shared UI primitives: Typography (Heading, Text)
  lib/
    api/                    Shared API client (see below)
    auth/                   Session/OIDC/CSRF (see "Agent authentication" below)
  styles/
    breakpoints.ts           Responsive breakpoint constants (mirrors Tailwind's scale)
  proxy.ts                 Route guard for "/agent/:path*" (F0.2)
__tests__/                  Vitest + Testing Library specs
```

### Public vs agent surfaces

Per `docs/architecture/module-boundaries.md`, this app cleanly separates:

- **Public Web** — `src/app/(public)/*`, unauthenticated, serves FR8–FR13
  (browse/search/view listings). A route group so it renders at the URL
  root (`/`, and future `/listings`, `/listings/[id]`, etc.) — real-estate
  search/listing URLs generally shouldn't carry a `/public` prefix.
- **Agent Web** — `src/app/agent/*`, authenticated (F0.2). It's a real
  `/agent` URL segment (not just a route group) so the auth guard has a
  single path prefix to protect: `src/proxy.ts` (Next.js 16's renamed
  middleware), `matcher: "/agent/:path*"`.

### Agent authentication (F0.2)

Agent auth is delegated to a managed OIDC provider
(`docs/architecture/ADR-0002`), with one important amendment to the original plan: **the Next
server is a BFF (backend-for-frontend) proxy for all `agent-api` traffic.**
An httpOnly session cookie can't be read by browser JS, so the browser
cannot construct an `Authorization: Bearer` header itself — it never holds
or sees an access/refresh token, full stop. `public-api` is entirely
unaffected: it stays a direct, unauthenticated browser-to-backend call.

- `src/app/api/auth/{login,callback,logout}` — Authorization Code + PKCE
  flow (hand-rolled, `src/lib/auth/oidc-client.ts`; no vendor SDK since the
  IdP isn't chosen yet), `state` verification, session cookie issuance.
- `src/lib/auth/session.ts` (`server-only`) — encrypted session cookie
  (`accessToken`/`refreshToken`/expiries/`remember`), sliding renewal,
  remember-me policy (~8h idle vs ~30d/~14d persistent).
- `src/app/api/agent/[...path]/route.ts` — the BFF proxy itself: reads the
  session, refreshes the access token if near expiry, forwards the request
  to the real backend `agent-api` origin with `Authorization: Bearer
  <token>` attached server-side, and streams the response back. Rejects
  non-GET requests that fail either CSRF check (`src/lib/auth/csrf.ts`) with
  `403` — moving the credential from a header to a cookie reintroduces CSRF,
  which bearer tokens were immune to.
- `src/proxy.ts` — route guard (`matcher: "/agent/:path*"`); unauthenticated
  navigation redirects to `/login` and returns to the original path after
  sign-in.

### API client

`src/lib/api/` wraps `fetch` for the backend's two HTTP surfaces
(`public-api`, `agent-api` per module-boundaries.md):

- `publicApiClient` — unauthenticated reads (search, listing detail); safe
  to call from the browser directly. Base URL:
  `NEXT_PUBLIC_PUBLIC_API_BASE_URL` (see `.env.example`).
- `agentApiClient` (`lib/api/agent-api.ts`) — the browser-safe client. It
  never attaches a token; it calls the same-origin BFF proxy at
  `/api/agent/*` with `credentials: "same-origin"` plus the CSRF header the
  proxy requires. The real backend origin (`AGENT_API_BASE_URL`, server-only,
  **not** `NEXT_PUBLIC_`) is read only inside the proxy route
  (`lib/api/server-config.ts`) — never inline it into the client bundle.
- `createAuthorizedAgentApiClient` (`lib/api/agent-api.server.ts`,
  `server-only`) — for Server Components that want to call the backend
  directly instead of round-tripping through the BFF proxy path (e.g.
  `app/agent/layout.tsx` fetching the signed-in agent's profile). Pulls the
  bearer token from the session; never import this from a Client Component.

`GET /api/agent/me` is mocked (`AGENT_API_MOCK=true` — see `.env.example`
and `lib/api/agent-me-dev-mock.ts`) for local dev and tests, since the real
backend `agent-api` (B0.2a/B0.2b) is built in parallel against this same
pinned contract (`lib/api/agent-me.ts`).

## Explicitly out of scope for this task (F0.2)

Listing management UI (FR2–FR6), agent profile edit UI (FR14), and the
public search/browse UI are separate downstream tasks.
