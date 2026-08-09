# ADR-0003: Image Storage — Object Storage + CDN, Pre-signed Direct Upload

- Status: Accepted
- Date: 2026-07-16
- Deciders: Architect (for tech-lead review)

## Context

Requirements section 8 asks to confirm the image storage approach and CDN needs.
NFR3 requires: multiple images per listing, scalable storage that is **not DB blobs**,
and reasonable load performance on listing pages. FR2 requires multiple photos with one
marked primary/cover; the `ListingImage` entity carries `url`, `is_primary`,
`sort_order`.

## Decision

Store image **binaries in S3-compatible object storage**, serve them through a **CDN**,
and keep only references (object key / URL + metadata) in PostgreSQL.

### Upload flow (direct-to-storage via pre-signed URLs)

1. Agent client requests an upload slot from the `media` module (authenticated).
2. `media` returns a short-lived **pre-signed upload URL** (or POST policy) scoped to a
   single object key under the listing's prefix, plus content-type/size constraints.
3. Browser uploads the file **directly to object storage** — bytes do not transit the
   API server.
4. Client confirms completion; `media` creates a `listing_image` row (key, `is_primary`,
   `sort_order`) after validating the object exists and matches constraints.

### Serving

- Public listing pages reference **CDN URLs**, not origin object-storage URLs.
- Store the object key as the durable identifier; derive/serve URLs via the CDN base.
- Generate **derivative sizes** (thumbnail for grid/cover, larger for gallery) to keep
  listing/search pages light on mobile (NFR3, NFR5). Options: an image-transform CDN, or
  pre-generated variants on upload confirmation. Prefer whichever the chosen provider
  supports natively; keep the variant-URL logic inside the `media` module.

## Rationale

- Object storage is the standard scalable, cheap, durable home for user media and keeps
  the relational DB small and fast (explicitly required by NFR3: "not DB blobs").
- Pre-signed direct upload keeps large binaries off the app tier, so the stateless API
  scales without becoming an upload bottleneck.
- A CDN is required (not optional) to meet "reasonable load performance on listing pages"
  for image-heavy galleries across geographies and on mobile.

## Consequences

- Positive: scalable, cheap, fast media path; app tier stays stateless and light.
- Negative: eventual cleanup needed for orphaned objects (upload started, never
  confirmed, or listing deleted). Mitigation: object lifecycle rules + a reconciliation
  job that removes objects with no `listing_image` row; delete/withdraw of a listing
  enqueues object cleanup.
- Constraint: DB stores keys/URLs only — never binary blobs. Exactly one `is_primary`
  image per listing is enforced by the `media`/`listing` modules.

## Open risks

- Content moderation of uploaded images is out of scope for v1 (no admin tooling).
  Flagged for future admin/moderation work.
