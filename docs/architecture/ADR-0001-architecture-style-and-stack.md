# ADR-0001: Architecture Style and Baseline Stack

- Status: Accepted
- Date: 2026-07-16
- Deciders: Architect (for tech-lead review)

## Context

Requirements section 8 asks whether v1 should be a single monolithic service or be
split into `listing-service` / `search-service` from day one.

v1 is an MVP with two actors (agents, public visitors) and two core flows (post,
browse). No payments, messaging, offers, or admin tooling. Expected initial volume is
low (small number of agents, modest listing counts). Team size is small and time-to-MVP
matters more than independent scaling.

## Decision

Build v1 as a **modular monolith**: a single deployable application (single API process
+ single primary database) internally partitioned into strict modules with explicit
boundaries. Do **not** split into separate deployable services for v1.

### Modules (logical, in one deployable)

- `agent` — agent profile + identity linkage (see ADR-0002).
- `listing` — listing lifecycle, ownership, status transitions, validation.
- `media` — image upload orchestration, pre-signed URLs, image metadata (see ADR-0003).
- `search` — public query/filter/sort over published listings (see ADR-0004).
- `public-api` / `agent-api` — HTTP surfaces (public read; authenticated agent write).

Cross-module access happens only through each module's published interface
(service/port), never by reaching directly into another module's tables. This is the
seam that makes a future extraction to independent services cheap if volume demands it.

### Baseline stack (recommendation — tech lead may adjust)

- **Primary datastore:** PostgreSQL (relational). Chosen for strong constraints/enums
  (NFR6 data integrity), transactional listing/status updates, and native indexing
  strong enough to defer a dedicated search engine (ADR-0004).
- **Backend:** single API service (framework-agnostic; any mainstream typed backend is
  fine). Stateless app tier so it can scale horizontally behind a load balancer.
- **Frontend:** server-rendered or hybrid-rendered responsive web app (NFR5). Listing
  detail and search result pages should be crawlable and fast on mobile.
- **Object storage + CDN:** S3-compatible storage fronted by a CDN (ADR-0003).
- **Managed auth provider** for agent identity (ADR-0002).

## Rationale

- No requirement pushes independent scaling of listing vs search in v1; a premature
  split adds network hops, distributed-transaction complexity, and ops overhead for no
  MVP benefit.
- A modular monolith keeps the write path (agent edits price/status) and the read path
  (public search) in one transactional boundary, which directly serves flow #3
  ("change reflected in public view immediately") without an eventual-consistency sync.
- Module boundaries preserve the option value of a later split without paying its cost now.

## Consequences

- Positive: fastest path to MVP; simple deploy/observability; immediate read-after-write
  consistency for status/price changes.
- Negative: a single scaling unit — search-heavy load scales the whole app. Acceptable at
  v1 volume; revisit if read traffic dwarfs write traffic.
- Constraint imposed on implementers: **no cross-module DB access**; modules talk via
  interfaces only. Violating this erodes the extraction seam.

## Revisit triggers

- Sustained search read load requiring independent scaling from writes.
- Introduction of an async search index (ADR-0004) that warrants a dedicated indexer.
- Multi-region or team-topology growth that favors service ownership boundaries.
