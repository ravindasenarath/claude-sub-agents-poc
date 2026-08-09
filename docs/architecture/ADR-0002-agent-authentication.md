# ADR-0002: Agent Authentication — Delegated to Managed Provider

- Status: Accepted
- Date: 2026-07-16
- Deciders: Architect (for tech-lead review)

## Context

Requirements section 8 asks whether agent authentication should be self-built or
delegated to a third-party auth provider.

Relevant facts:
- Only **agents** authenticate (FR1). Public visitors never log in (FR13, NFR1).
- Auth guards create/edit/delete of listings (NFR1). Ownership checks are separate
  (NFR2, see Authorization below).
- v1 has no requirement for social login, SSO, MFA policies, or agency org hierarchies,
  but agents are business users whose accounts gate content publication.
- Building auth well (password hashing, reset flows, session/token security, lockout,
  breach response) is high-risk, low-differentiation work.

## Decision

**Delegate agent authentication to a managed third-party auth provider** (e.g. an
OIDC/OAuth2-based identity provider). The provider owns credential storage, login,
password reset, and token issuance. Our application:

1. Trusts signed tokens (JWT/OIDC) from the provider for authenticated requests.
2. Maintains its own `agent` record keyed by the provider's stable subject id
   (`auth_subject`), holding domain profile data (agency name, phone, contact email,
   profile photo — FR14).
3. Wraps all provider interaction behind an internal **`AuthProvider` interface**
   (verify token → principal, get subject id). No provider SDK types leak into the
   `listing`/`media`/`search` modules.

### Authorization (NFR2) is ours, not the provider's

Authentication (who you are) is delegated; **authorization (what you may touch) stays in
the `listing` module**. Every edit/delete/status-change checks
`listing.agent_id == principal.agent_id` server-side. Never trust client-supplied owner
ids. This ownership rule is enforced in the domain layer, not just the API layer.

## Rationale

- Smallest security surface for an MVP: we do not store or hash passwords, and inherit
  the provider's reset/lockout/breach handling.
- Only agents log in, so the per-identity cost of a managed provider is negligible at v1
  volume.
- The `AuthProvider` seam keeps us free to switch providers or move to self-hosted
  identity later without touching domain modules.

## Consequences

- Positive: no bespoke credential handling; faster, safer MVP; clean separation of authN
  (delegated) from authZ (owned).
- Negative: external dependency and its availability/cost; provider outage affects agent
  login (not public browsing, which is unauthenticated — good isolation).
- Constraint: the local `agent` record is the source of truth for domain authorization;
  the provider is the source of truth only for identity/credentials. Keep them linked by
  `auth_subject` and provision the local `agent` row on first login.

## Revisit triggers

- Need for agency-level org accounts / role hierarchies beyond a flat agent role.
- Regulatory/data-residency requirements that constrain provider choice.
