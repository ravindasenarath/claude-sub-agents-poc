# ADR-0004: Search — DB-native Filtering for v1, Search Engine Deferred

- Status: Accepted
- Date: 2026-07-16
- Deciders: Architect (for tech-lead review)

## Context

Requirements section 8 asks: DB-native filtering vs a dedicated search index (e.g.
Elasticsearch), and whether v1 volume is low enough to defer the latter.

Search requirements:
- FR8: list/grid of published listings, default newest first.
- FR9: search by location — suburb, postcode, or state.
- FR10: filter by listing type, property type, price range (min/max), min bedrooms,
  min bathrooms.
- FR11: sort by price asc/desc, newest.
- NFR4: reasonable response time as volume grows; do not assume a naive full-table scan
  is acceptable forever.

Note what v1 does **not** need: free-text relevance ranking, typo tolerance/fuzzy match,
typeahead autocomplete, or map/geo search (section 5). Location search is structured
(exact suburb/postcode/state), not natural-language.

## Decision

Implement search with **PostgreSQL-native filtering and indexing** for v1. Defer any
dedicated search engine (Elasticsearch/OpenSearch). All query access goes through a
single **`SearchService` interface** so the engine can be swapped later without touching
callers (the public API).

### Indexing plan (satisfies NFR4)

- Filter/sort predicates run against **published** listings only; queries always include
  `status = 'PUBLISHED'`.
- Suggested indexes on `listing`:
  - B-tree on normalized location columns: `suburb`, `postcode`, `state`
    (store `suburb`/`state` normalized, e.g. lower-cased, to make lookups exact and
    index-friendly).
  - Composite/partial indexes tuned to the common query shape, e.g. a **partial index on
    `WHERE status = 'PUBLISHED'`** covering `(listing_type, property_type)` plus sort
    keys.
  - B-tree on `price` and on `created_at` to support sort (FR11) and range filters (FR10).
  - Numeric columns `bedrooms`, `bathrooms` indexed as needed for `>=` filters.
- Enforce **keyset/seek pagination** (or bounded offset) so result pages stay fast as
  volume grows rather than deep-offset scanning.
- If loose suburb matching is later wanted, add a `pg_trgm` GIN index — still within
  Postgres, no new infrastructure.

## Rationale

- v1 search is structured filtering + simple sort, which relational indexes serve well.
  There is no relevance-ranking or fuzzy-match requirement that would justify a search
  engine.
- Keeping search in the primary DB preserves **read-after-write consistency** for flow #3
  (an agent's price/status edit is immediately reflected in public results) with no index
  sync lag.
- A dedicated engine adds a second datastore, an ingestion/sync pipeline, and eventual
  consistency — real cost with no v1 benefit at low volume.
- The `SearchService` seam means adopting an engine later is a module-internal change.

## Consequences

- Positive: no extra infrastructure; immediate consistency; NFR4 met via indexes and
  seek pagination rather than full scans.
- Negative: complex full-text/fuzzy/relevance search would eventually strain Postgres.
  Acceptable — not required in v1.
- Constraint: every search path must be index-backed and filter on `status = 'PUBLISHED'`;
  no unindexed full-table scans in the hot path. All access via `SearchService`.

## Revisit triggers

- Requirement for free-text relevance, typo tolerance, or autocomplete.
- Listing volume / query latency where tuned Postgres indexes stop meeting NFR4.
- Introduction of map/geo search (out of scope now) which favors a geo-capable engine.

## Amendment (2026-08-09): `search` owns no table or index of its own

Resolved by the tech lead during B0.1 backend-scaffolding review: `search` has **no
direct database access at all**, not even inside its own `internal` package. `search`
must never issue SQL against the `listing` table (or any table) - it reads listing data
exclusively through `listing.api`'s `findPublished(ListingQuery)` query port.

This makes the "Indexing plan" above a **`listing` module obligation, not `search`'s**:
the suggested indexes (location B-trees, the partial index on `WHERE status =
'PUBLISHED'`, price/`created_at` B-trees, keyset pagination, optional `pg_trgm`) live in
`listing.internal`, behind `findPublished`, alongside the rest of the `listing` table's
schema - not in a separate `search`-owned table or index path. `search` (via
`SearchService`) still owns validation, suburb/state normalization, sort whitelist, and
pagination/cursor *policy*, and composes results by calling `findPublished`; the DB-native
filtering/indexing *implementation* satisfying NFR4 is `listing`'s to build in the DB
schema/migrations task.

This is now mechanically enforced by `ModuleBoundaryTest.searchModuleNeverDependsOnJdbcOrSql`
(backend), which forbids anything in `search` - including `search.internal` - from
depending on `org.springframework.jdbc`, `javax.sql`, or `java.sql`. See
`module-boundaries.md` rule 6.
