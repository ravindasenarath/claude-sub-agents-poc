package com.plp.platform.search.api;

/**
 * The {@code search} module's published interface, named to match
 * ADR-0004/module-boundaries.md exactly.
 *
 * <p>Pure scaffolding: no query/filter/sort/pagination methods declared,
 * no implementation - that logic is explicitly out of scope for this task.
 *
 * <p>Per the search/DB-access architecture decision, an implementation of
 * this interface owns validation, suburb/state normalization, sort
 * whitelist, and pagination/cursor policy, and composes its results
 * exclusively by calling
 * {@link com.plp.platform.listing.api.ListingModuleApi#findPublished}; it
 * must never issue SQL against the {@code listing} table itself.
 */
public interface SearchService {
}
