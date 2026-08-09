# Module & Component Boundaries (v1)

Single deployable (modular monolith, ADR-0001). Modules communicate only through their
published interfaces; **no cross-module database access**. This is the seam that keeps a
future service split (ADR-0001 revisit) cheap.

## Component diagram (as text)

```
                          Public Visitor (no auth)            Agent (browser, authenticated)
                                   |                                        |
                                   |                                        | httpOnly session cookie
                                   v                                        v
                        +----------------------+             +-----------------------------+
                        |  Public Web (SSR/    |             |  Agent Web (Next.js server) |
                        |  responsive, NFR5)   |             |  SSR + agent-api BFF proxy; |
                        |                      |             |  owns httpOnly OIDC session |
                        +----------+-----------+             +--------------+--------------+
                                   | HTTP (read, no auth)                   | HTTP (write, Bearer
                                   |                                        |   token added server-side)
                                   v                                        v
        +--------------------------------------------------------------------------------+
        |                         API layer (single deployable)                          |
        |                                                                                |
        |   public-api  ----> SearchService ----+        agent-api --> AuthProvider (I)  |
        |   (read only)                          |        (guarded)          |           |
        |                                        |                           v           |
        |                                        |                    [Managed IdP]      |
        |                                        v                                       |
        |   +-----------+     +-----------+   +-----------+   +-----------+              |
        |   |  agent    |     |  listing  |<--|  search   |   |  media    |              |
        |   |  module   |<----|  module   |   |  module   |   |  module   |              |
        |   +-----------+     +-----------+   +-----------+   +-----------+              |
        |         |                 |                               | pre-signed URL     |
        +---------|-----------------|-------------------------------|--------------------+
                  |                 |                               |
                  v                 v                               v
             +----------------------------------------------+   +------------------+
             |          PostgreSQL (primary datastore)       |  | S3-compatible    |
             |  agent | listing | listing_image (metadata)   |  | object storage   |
             +----------------------------------------------+   +---------+--------+
                                                                          |
                                                                          v
                                                                      +-------+
                                                                      |  CDN  |---> image bytes to browsers
                                                                      +-------+
```

## Module responsibilities & interfaces

### `agent`
- Owns: `agent` profile record (FR14), linkage to auth identity via `auth_subject`.
- Interface: `getAgentByAuthSubject`, `getPublicContact(agentId)` (name + contact for
  FR15), `provisionOnFirstLogin`.
- Depends on: `AuthProvider` interface (ADR-0002).

### `listing`
- Owns: listing lifecycle, ownership, status transitions (FR2–FR6), validation (NFR6),
  timestamps (NFR7). **Enforces authorization** (NFR2): mutations require
  `listing.agent_id == principal.agent_id`.
- Interface: `createDraft`, `updateListing`, `changeStatus`, `withdraw/delete`,
  `getOwnListings(agentId)`, `getPublishedListing(id)`.
- Status enum + transition rules live here. Only `PUBLISHED` listings are exposed to
  public read paths (FR7).

### `search`
- Owns: public query/filter/sort over `PUBLISHED` listings (FR8–FR11), index-backed
  (ADR-0004). Exposes `SearchService` interface (query + filters + sort + pagination).
- Read-only over listing data; no writes.

### `media`
- Owns: image upload orchestration (ADR-0003), pre-signed URL issuance, `listing_image`
  metadata (`is_primary`, `sort_order`), derivative/variant URL logic, orphan cleanup.
- Interface: `requestUploadSlot(listingId)`, `confirmUpload(...)`, `setPrimary`,
  `reorder`, `listImages(listingId)`, `deleteImagesForListing`.

### API surfaces
- `public-api`: unauthenticated read endpoints (search results, listing detail). Serves
  only `PUBLISHED` data. Called **directly by the browser** (and by Public Web SSR); needs
  CORS for the web origin, with credentials disabled.
- `agent-api`: authenticated write endpoints; every request carries a verified principal;
  ownership enforced in `listing`/`media`. Called **only by the Agent Web Next.js server**
  (its BFF proxy route or its Server Components) — never by browser JavaScript. Therefore
  `agent-api` needs **no CORS configuration**: it receives no cross-origin browser
  requests.

### Agent token transport (BFF)

The bearer token for `agent-api` is never exposed to browser JavaScript. The Next.js
server is the confidential OIDC client (ADR-0002): it completes the OIDC code flow, stores
the token set in an encrypted **httpOnly, Secure, SameSite=Lax session cookie** it owns,
and attaches `Authorization: Bearer <token>` server-side when forwarding agent calls.

- Browser -> Next server: same-origin, session cookie only.
- Next server -> `agent-api`: bearer token, server-to-server.
- Because the browser-facing credential is a cookie, the proxy route must enforce CSRF
  defenses (origin/`Sec-Fetch-Site` check + required custom header on non-GET).
- Unaffected: `public-api` reads (direct from browser) and ADR-0003 pre-signed image
  uploads (browser -> object storage directly). Only the small JSON call that requests the
  upload slot traverses the proxy.

## Boundary rules (constraints for implementers)

1. No module reads or writes another module's tables directly — go through its interface.
2. Public read paths must never surface non-`PUBLISHED` listings (FR7).
3. Authorization (ownership) is enforced in the domain layer, not only at the API edge.
4. Provider/vendor SDK types (auth, storage) stay behind their module's interface; they
   must not leak into `listing`/`search`.
5. All search access goes through `SearchService`; no ad-hoc queries in `public-api`.
6. `search` must not depend on JDBC/SQL types directly (no database of its own, not even
   in `search.internal`); all listing data access goes through
   `listing.api`'s `findPublished(ListingQuery)` query port. DB-native filtering/indexing
   for published listings (ADR-0004) lives in `listing.internal`, not in a
   `search`-owned table/index path.
7. The `agent-api` bearer token must never be readable by browser JavaScript. All
   `agent-api` traffic originates from the Agent Web server (BFF proxy or Server
   Components). No `NEXT_PUBLIC_` env var may carry the `agent-api` origin, and no client
   component may hold or forward a token.

## Amendment (2026-08-09): agent token transport is server-side (BFF), not browser-direct

Resolved by the tech lead ahead of the B0.2/F0.2 auth stage. The original component
diagram showed `Agent Web --HTTP (write, Bearer token)--> agent-api` with the browser
attaching the token, and `web/src/lib/api/config.ts` asserted "browsers call the API layer
directly (no server-side BFF hop) for both surfaces". That is incompatible with the
httpOnly session cookie required by ADR-0002's confidential-client model: an httpOnly
cookie is by definition unreadable by browser JS, so the browser cannot construct the
`Authorization` header.

Resolution: the **agent surface gains a server-side proxy hop**; the **public surface does
not change**. See "Agent token transport (BFF)" above and rule 7. Rejected alternative:
exposing the token to browser JS (memory or storage) - the agent surface is the system's
only write path, so a JS-readable token turns any XSS into full listing takeover (NFR1/
NFR2). The proxy hop costs one colocated server-to-server round trip on agent write calls
only; NFR4's public search path is untouched. It also *removes* the cross-origin
credential/CORS question for `agent-api` entirely.

Backend impact: none. `agent-api` still receives `Authorization: Bearer <jwt>` and
`AuthProvider.verify(String)` is unchanged in shape. This is a frontend topology decision.
