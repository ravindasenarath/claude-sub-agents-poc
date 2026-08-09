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
 * <p><b>Architecture decision:</b> {@code search} does not, and may never,
 * issue SQL against the {@code listing} table directly - resolved by the
 * tech lead (ADR-0004 amendment). Instead, {@code listing.api} publishes a
 * read-only query port,
 * {@link com.plp.platform.listing.api.ListingModuleApi#findPublished},
 * which {@code listing.internal} implements as one index-backed SQL
 * statement filtering {@code status = 'PUBLISHED'}. {@code search} (via
 * {@link com.plp.platform.search.api.SearchService}) owns validation,
 * suburb/state normalization, sort whitelist, and pagination/cursor policy,
 * and composes results by calling into {@code listing.api} - it issues no
 * SQL of its own. This is mechanically enforced, not just a design
 * convention: {@code ModuleBoundaryTest#searchModuleNeverDependsOnJdbcOrSql}
 * forbids anything in {@code search} - including {@code search.internal} -
 * from depending on {@code org.springframework.jdbc}, {@code javax.sql}, or
 * {@code java.sql} at all, closing the gap the module-wide
 * {@code onlyModuleInternalsMayDependOnJdbcOrSql} rule leaves open (that
 * rule permits any module's {@code internal} package, including
 * {@code search.internal}, to use JDBC).
 *
 * <p>Published interface: {@link com.plp.platform.search.api}.
 * Implementation detail: {@link com.plp.platform.search.internal}.
 */
package com.plp.platform.search;
