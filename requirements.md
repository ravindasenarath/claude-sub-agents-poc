# Requirement Document: Property Listing Platform (v1)

## 1. Overview
A web application where real estate agents can post property listings for sale or rent,
and the public can browse and view those listings. This is a v1 / MVP scope focused on
the two core flows: **posting** and **viewing** properties. No transactions, payments,
messaging, or offer management are in scope for this version.

Inspiration: realestate.com.au, scoped down to core functionality only.

## 2. Actors / User Roles

| Role | Description |
|---|---|
| **Agent** | A real estate agent/agency user. Can create, edit, and remove property listings they own. |
| **Public User (Visitor)** | Anonymous or registered person browsing listings. Can search, filter, and view listing details. Cannot post listings. |
| **Admin** *(stretch, not core MVP)* | Can moderate/remove any listing. Included here for architecture awareness only — not required for v1 build. |

## 3. Functional Requirements

### 3.1 Agent — Post & Manage Listings
- FR1: An agent must register/log in before posting a listing.
- FR2: An agent can create a new property listing with:
  - Listing type: **For Sale** or **For Rent**
  - Property type: House, Apartment/Unit, Townhouse, Land, Other
  - Address (street, suburb, state, postcode)
  - Price (sale price, or rent amount + frequency e.g. weekly/monthly)
  - Bedrooms, bathrooms, parking spaces (numeric)
  - Land size / floor size (optional)
  - Description (free text)
  - Photos (multiple images, one marked as primary/cover)
  - Agent contact details (name, phone, email) — defaulted from agent profile
- FR3: An agent can edit an existing listing they own.
- FR4: An agent can change a listing's status: **Draft**, **Published**, **Under Offer / Leased**, **Withdrawn**.
- FR5: An agent can delete/withdraw a listing they own.
- FR6: An agent can view a list of all their own listings with current status.
- FR7: Only **Published** listings are visible to public users.

### 3.2 Public User — Browse & View Listings
- FR8: A visitor can view a list/grid of published listings (default: newest first).
- FR9: A visitor can search listings by location (suburb, postcode, or state).
- FR10: A visitor can filter listings by:
  - Listing type (Sale / Rent)
  - Property type
  - Price range (min/max)
  - Minimum bedrooms / bathrooms
- FR11: A visitor can sort results (e.g. price low-high, high-low, newest).
- FR12: A visitor can open a listing detail page showing all listing fields, photo gallery, and agent contact details.
- FR13: A visitor does **not** need to log in to search or view listings.

### 3.3 Agent Profile
- FR14: An agent has a basic profile: name, agency name, phone, email, profile photo (optional).
- FR15: A public listing detail page shows the posting agent's name and contact details.

## 4. Non-Functional Requirements
- NFR1: **Authentication** required for agent-only actions (create/edit/delete listings); public browsing requires none.
- NFR2: **Authorization**: an agent can only edit/delete their own listings.
- NFR3: **Image storage**: listings support multiple images; needs scalable storage (not DB blobs) and reasonable load performance on listing pages.
- NFR4: **Search performance**: location + filter search should return results in a reasonable time as listing volume grows (design should not assume a naive full-table scan is fine forever).
- NFR5: **Responsive design**: usable on desktop and mobile browsers.
- NFR6: **Data integrity**: price, bedroom/bathroom counts, and status must be validated (no negative numbers, status must be one of the defined enum values).
- NFR7: Basic **audit trail**: created/updated timestamps on listings.

## 5. Out of Scope (v1)
- Payments, subscriptions, or featured/paid listings
- In-app messaging or lead enquiry forms between visitor and agent (contact is via displayed phone/email only)
- Saved searches, favourites/watchlist, or email alerts
- Map-based search / geolocation search
- Mortgage calculators, suburb profile/insights pages
- Admin moderation tooling
- Mobile native apps (web only)

## 6. Core Data Entities (for architect's reference, not final schema)
- **Agent**: id, name, agency name, phone, email, profile photo, created_at
- **Listing**: id, agent_id (FK), listing_type, property_type, address fields, price/rent fields, bedrooms, bathrooms, parking, land_size, floor_size, description, status, created_at, updated_at
- **ListingImage**: id, listing_id (FK), url, is_primary, sort_order

## 7. Key User Flows to Support
1. Agent signs up/logs in → creates listing → publishes it → it appears in public search.
2. Visitor searches by suburb + filters → sees result list → opens a listing → sees full details + agent contact.
3. Agent edits price/status on an existing listing → change reflected in public view immediately (or near-immediately).

## 8. Open Questions for Architect
- Should agent authentication be self-built or delegated to a third-party auth provider?
- Single monolithic service for v1, or separate listing-service/search-service split from day one?
- Image storage: cloud object storage (e.g. S3-compatible) — confirm approach and CDN needs.
- Search implementation: DB-native filtering vs dedicated search index (e.g. Elasticsearch) — is v1 volume low enough to defer this?