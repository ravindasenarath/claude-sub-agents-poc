# Module & Component Boundaries (v1)

Single deployable (modular monolith, ADR-0001). Modules communicate only through their
published interfaces; **no cross-module database access**. This is the seam that keeps a
future service split (ADR-0001 revisit) cheap.

## Component diagram (as text)

```
                          Public Visitor (no auth)              Agent (authenticated)
                                  |                                     |
                                  v                                     v
                        +---------------------+             +----------------------+
                        |   Public Web (SSR/   |            |   Agent Web (SSR/     |
                        |   responsive, NFR5)  |            |   responsive, NFR5)   |
                        +----------+----------+             +-----------+----------+
                                   | HTTP (read)                        | HTTP (write, Bearer token)
                                   v                                    v
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
  only `PUBLISHED` data.
- `agent-api`: authenticated write endpoints; every request carries a verified principal;
  ownership enforced in `listing`/`media`.

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
