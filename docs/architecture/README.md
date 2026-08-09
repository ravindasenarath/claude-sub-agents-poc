# Architecture Documentation — Property Listing Platform (v1)

This directory holds the initial architecture for the Property Listing Platform (v1),
a scoped-down real estate listing web app. Source requirement:
`/home/ravinda/Codes/claude/sub-agents/requirements.md`.

## Index

| Doc | Purpose |
|---|---|
| [ADR-0001-architecture-style-and-stack.md](./ADR-0001-architecture-style-and-stack.md) | Modular monolith vs service split; baseline stack |
| [ADR-0002-agent-authentication.md](./ADR-0002-agent-authentication.md) | Self-built vs delegated agent auth |
| [ADR-0003-image-storage.md](./ADR-0003-image-storage.md) | Object storage + CDN, upload flow |
| [ADR-0004-search-implementation.md](./ADR-0004-search-implementation.md) | DB-native filtering vs dedicated search index |
| [module-boundaries.md](./module-boundaries.md) | Internal module/component boundaries + diagram-as-text |
| [data-model.md](./data-model.md) | Entities, relationships, enums, integrity constraints |
| [nfr-mapping.md](./nfr-mapping.md) | How each NFR (NFR1–7) is satisfied |

## Decision summary (answers to requirements section 8)

| Open question | Decision |
|---|---|
| Agent auth: self-built or delegated? | **Delegated** to a managed auth provider, wrapped behind an internal `AuthProvider` interface. See ADR-0002. |
| Monolith or listing/search service split? | **Modular monolith** for v1, with strict internal module boundaries that permit later extraction. See ADR-0001. |
| Image storage approach? | **S3-compatible object storage + CDN**, direct browser upload via pre-signed URLs, DB stores keys/URLs only. See ADR-0003. |
| Search: DB-native or dedicated index? | **DB-native (PostgreSQL) filtering with purpose-built indexes** for v1; dedicated search engine deferred behind a `SearchService` seam. See ADR-0004. |

## Scope guardrails (from requirements section 5)

Out of scope for v1 and explicitly **not** to be designed for now: payments/featured
listings, in-app messaging/enquiry forms, saved searches/favourites/alerts, map/geo
search, calculators/suburb insights, admin moderation tooling, native mobile apps.
Admin role is acknowledged in the data model for forward-compatibility only.
