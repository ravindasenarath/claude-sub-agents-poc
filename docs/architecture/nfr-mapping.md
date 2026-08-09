# NFR Mapping (v1)

How each non-functional requirement is addressed by the architecture.

| NFR | Requirement | How it is addressed | Owning module / doc |
|---|---|---|---|
| NFR1 | Authentication for agent-only actions; none for public browsing | Delegated managed auth (OIDC/OAuth2); `agent-api` requires a verified token, `public-api` is fully unauthenticated. Public browse/search/view need no login (FR13). | `agent`, `agent-api` / ADR-0002 |
| NFR2 | Agent can only edit/delete own listings | Ownership check `listing.agent_id == principal.agent_id` enforced in the `listing` domain layer on every mutation (not just at the API edge). Client-supplied owner ids never trusted. | `listing` / ADR-0002, module-boundaries |
| NFR3 | Scalable image storage (not DB blobs), good page load | S3-compatible object storage + CDN; DB holds only object keys; derivative sizes for grid/gallery; pre-signed direct upload keeps bytes off the app tier. | `media` / ADR-0003 |
| NFR4 | Search performance as volume grows; no naive full-table scans | PostgreSQL-native filtering with purpose-built (incl. partial `status='PUBLISHED'`) indexes, seek/keyset pagination, all access via `SearchService`; dedicated engine deferred but seam ready. | `search` / ADR-0004 |
| NFR5 | Responsive on desktop and mobile | Server-rendered/hybrid responsive web frontends; CDN-served, appropriately-sized images to keep mobile pages light. | Public/Agent Web / ADR-0001, ADR-0003 |
| NFR6 | Validate price, bed/bath counts, status | DB enum types for `listing_type`/`property_type`/`status`/`rent_frequency`; CHECK constraints for non-negative numerics; conditional sale/rent field requirements and status-transition rules enforced in `listing`. | `listing` / data-model |
| NFR7 | Basic audit trail | `created_at` / `updated_at` timestamps on `listing` (and `created_at` on `agent`); `updated_at` bumped on every mutation. | `listing` / data-model |

## Key flow support (requirements section 7)

1. **Agent signs up/logs in -> creates -> publishes -> appears in public search.**
   Managed IdP login (ADR-0002) -> `agent` provisioned -> `listing.createDraft` ->
   `changeStatus(PUBLISHED)` -> immediately queryable via `SearchService` because search
   reads the same primary DB (ADR-0004, no index sync lag).

2. **Visitor searches by suburb + filters -> result list -> listing detail + agent contact.**
   `public-api` -> `SearchService` (index-backed, `status='PUBLISHED'` only) ->
   `getPublishedListing(id)` -> joins agent public contact (FR15) and CDN image URLs.

3. **Agent edits price/status -> reflected in public view immediately.**
   Single transactional datastore means write-then-read consistency: the edit is visible
   to the next public query with no eventual-consistency window. This is a primary reason
   for the modular-monolith + DB-native-search decisions (ADR-0001, ADR-0004).

## Cross-cutting notes

- **AuthN vs AuthZ split:** authentication delegated (provider), authorization owned
  (domain layer). Do not conflate them.
- **Extraction seams preserved:** `AuthProvider`, `SearchService`, and per-module
  interfaces keep provider-swaps and a future service split low-cost.
- **Orphaned media** (uploaded-but-unconfirmed, or post-delete objects) handled by
  lifecycle rules + reconciliation (ADR-0003) — an operational, not architectural, risk.
