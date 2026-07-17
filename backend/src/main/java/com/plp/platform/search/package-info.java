/**
 * {@code search} module (module-boundaries.md).
 *
 * <p>Owns public query/filter/sort over {@code PUBLISHED} listings
 * (FR8-FR11), index-backed per ADR-0004 (PostgreSQL-native filtering
 * deferred from a dedicated search engine). Read-only over listing data; no
 * writes. Every query must filter on {@code status = 'PUBLISHED'} and be
 * index-backed - no unindexed full-table scans in the hot path (ADR-0004).
 *
 * <p>Allowed dependency: {@link com.plp.platform.listing.api}. Must never
 * depend on {@code agent}, {@code media}, {@code publicapi}, or
 * {@code agentapi}.
 *
 * <p><b>Architecture note (flag for the tech lead / DB schema task):</b> the
 * module-boundaries.md component diagram shows {@code search} with its own
 * direct line to PostgreSQL (like {@code agent}/{@code listing}/{@code media}),
 * which reads as "search may query the {@code listing} table directly for
 * index-backed filtering" rather than "search must call into listing's Java
 * API for every row". That is a reasonable read-side exception to the
 * general "no cross-module DB access" rule (rule 1), but it is not spelled
 * out explicitly as an exception in module-boundaries.md. Whoever implements
 * the {@code search} module's persistence layer should get this confirmed
 * explicitly (e.g. as an ADR amendment) rather than assuming either
 * direction silently.
 *
 * <p>Published interface: {@link com.plp.platform.search.api}.
 * Implementation detail: {@link com.plp.platform.search.internal}.
 */
package com.plp.platform.search;
