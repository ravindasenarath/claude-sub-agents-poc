# Data Model (v1)

Primary datastore: PostgreSQL (ADR-0001). This is the logical model derived from
requirements section 6, with integrity rules (NFR6) and audit fields (NFR7) made
explicit. Not a final migration script — schema details are the implementers' to finalize
within these constraints.

## Entities & relationships (as text)

```
  agent (1) ----< (N) listing (1) ----< (N) listing_image
```

- An `agent` owns many `listing`s (`listing.agent_id` FK).
- A `listing` has many `listing_image`s (`listing_image.listing_id` FK), exactly one
  marked primary.

## agent

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| auth_subject | text, unique, not null | Stable subject id from managed IdP (ADR-0002) |
| name | text, not null | FR14 |
| agency_name | text | FR14 |
| phone | text | FR14 / contact (FR15) |
| contact_email | text | FR14 / contact (FR15) |
| profile_photo_key | text, nullable | object-storage key (ADR-0003), optional |
| created_at | timestamptz, not null | |

Notes: local `agent` row is the authorization source of truth; provisioned on first
login. Identity/credentials live in the IdP, not here.

## listing

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| agent_id | uuid (FK -> agent.id), not null | ownership (NFR2) |
| listing_type | enum: `SALE`, `RENT` | FR2 |
| property_type | enum: `HOUSE`, `APARTMENT`, `TOWNHOUSE`, `LAND`, `OTHER` | FR2 |
| street | text | FR2 address |
| suburb | text, not null | search key (FR9) — store normalized (e.g. lower-case) |
| state | text, not null | search key (FR9) |
| postcode | text, not null | search key (FR9) |
| sale_price | numeric(12,2), nullable | required when `listing_type = SALE` |
| rent_amount | numeric(12,2), nullable | required when `listing_type = RENT` |
| rent_frequency | enum: `WEEKLY`, `MONTHLY`, nullable | required when `listing_type = RENT` |
| bedrooms | int, not null | `>= 0` (NFR6) |
| bathrooms | int, not null | `>= 0` (NFR6) |
| parking | int, not null | `>= 0` (NFR6) |
| land_size | numeric, nullable | optional (FR2) |
| floor_size | numeric, nullable | optional (FR2) |
| description | text | FR2 |
| status | enum: `DRAFT`, `PUBLISHED`, `UNDER_OFFER_LEASED`, `WITHDRAWN` | FR4 |
| created_at | timestamptz, not null | NFR7 |
| updated_at | timestamptz, not null | NFR7, updated on every mutation |

### Integrity constraints (NFR6)

- CHECK: `bedrooms >= 0`, `bathrooms >= 0`, `parking >= 0`.
- CHECK: sale/rent price fields `>= 0` when present.
- Enum-typed columns for `listing_type`, `property_type`, `status`, `rent_frequency` —
  invalid values are rejected at the DB level.
- Conditional requirement (enforced in `listing` domain layer, optionally a CHECK):
  `SALE` => `sale_price` present; `RENT` => `rent_amount` + `rent_frequency` present.
- Status transitions validated in the `listing` module against an allowed transition map.

### Indexes (search — see ADR-0004)

- Partial index on `WHERE status = 'PUBLISHED'` covering common filter/sort columns.
- B-tree on `suburb`, `postcode`, `state` (normalized) for location search (FR9).
- B-tree on `price` expression and `created_at` for sort (FR11) and range filters (FR10).
- `agent_id` indexed for "my listings" (FR6).

## listing_image

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| listing_id | uuid (FK -> listing.id, ON DELETE CASCADE), not null | |
| object_key | text, not null | object-storage key (ADR-0003); DB stores keys, not blobs |
| is_primary | bool, not null, default false | exactly one true per listing |
| sort_order | int, not null | gallery ordering |

### Constraints

- Exactly one `is_primary = true` per `listing_id` (partial unique index on
  `(listing_id) WHERE is_primary`).
- No binary blobs in the DB (NFR3) — only `object_key`; public URLs derived via CDN base.
- Deleting/withdrawing a listing enqueues object cleanup in `media` (ADR-0003).

## Forward-compatibility note (Admin, out of scope)

The `admin` role (requirements section 2, stretch) is **not** modeled in v1 beyond
awareness. If added later, it maps to an elevated principal able to moderate/remove any
listing; the ownership check in `listing` would gain an admin-override branch. No schema
change is pre-built for it now.
