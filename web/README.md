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
      layout.tsx            Agent chrome: header/nav
      page.tsx               Placeholder agent dashboard
  components/
    layout/                 Layout primitives: Container, Stack, surface headers/footer
    ui/                     Minimal shared UI primitives: Typography (Heading, Text)
  lib/
    api/                    Shared API client (see below)
  styles/
    breakpoints.ts           Responsive breakpoint constants (mirrors Tailwind's scale)
__tests__/                  Vitest + Testing Library specs
```

### Public vs agent surfaces

Per `docs/architecture/module-boundaries.md`, this app cleanly separates:

- **Public Web** — `src/app/(public)/*`, unauthenticated, serves FR8–FR13
  (browse/search/view listings). A route group so it renders at the URL
  root (`/`, and future `/listings`, `/listings/[id]`, etc.) — real-estate
  search/listing URLs generally shouldn't carry a `/public` prefix.
- **Agent Web** — `src/app/agent/*`, will require authentication once F0.2
  (agent auth flow, a separate downstream task) lands. It's a real `/agent`
  URL segment (not just a route group) so a future auth guard has a single
  path prefix to protect — most likely via `proxy.ts` (Next.js 16's renamed
  middleware) with a `matcher: "/agent/:path*"`.

No authentication is wired up yet in this task (F0.1) — both surfaces
currently render for anyone. That is explicitly out of scope here and is
tracked as F0.2.

### API client

`src/lib/api/` wraps `fetch` for the backend's two HTTP surfaces
(`public-api`, `agent-api` per module-boundaries.md):

- `publicApiClient` — unauthenticated reads (search, listing detail).
- `agentApiClient` — authenticated writes; callers pass a `token` request
  option per-call until F0.2 wires up a shared session/token source.

Base URLs come from `NEXT_PUBLIC_PUBLIC_API_BASE_URL` /
`NEXT_PUBLIC_AGENT_API_BASE_URL` (see `.env.example`), defaulting to
`http://localhost:8080/api/public` and `http://localhost:8080/api/agent` for
local development against the backend scaffold.

## Explicitly out of scope for this task (F0.1)

Login/session UI, listing create/edit forms, and public search/browse UI are
separate downstream tasks. This app currently ships only placeholder pages
for each surface plus the shared shell/tokens/API client described above.
