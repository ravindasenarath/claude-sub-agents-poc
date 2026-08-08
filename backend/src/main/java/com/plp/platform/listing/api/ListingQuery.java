package com.plp.platform.listing.api;

/**
 * Query criteria for {@link ListingModuleApi#findPublished(ListingQuery)}.
 *
 * <p>Pure scaffolding: no fields declared yet. Per the search/DB-access
 * architecture decision, {@code search} (via {@code SearchService}) owns
 * validating and normalizing this criteria - suburb/state normalization,
 * sort whitelist, pagination/cursor policy - before calling into
 * {@code listing.api}; {@code listing.internal} only ever applies it as a
 * {@code status = 'PUBLISHED'}-filtered, index-backed query. Concrete
 * fields (suburb, state, sort, cursor/page size, ...) are deferred to the
 * follow-up task that implements real query logic.
 */
public record ListingQuery() {
}
