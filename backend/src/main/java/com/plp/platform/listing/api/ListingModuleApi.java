package com.plp.platform.listing.api;

/**
 * Marker for the {@code listing} module's published interface (see the
 * {@code listing.api} package Javadoc for the operations this will expose).
 *
 * <p>Pure scaffolding: no methods declared for CRUD/status-transition
 * operations, no implementation - that logic is explicitly out of scope
 * for this task.
 *
 * <p>{@link #findPublished(ListingQuery)} is the one exception: it is the
 * read-only query port that {@code search} (via {@code SearchService})
 * must call instead of issuing SQL against the {@code listing} table
 * directly (search/DB-access architecture decision). It is a signature
 * only - {@code listing.internal} does not implement it yet, and
 * {@code ListingQuery}/{@code PublishedListingSummary}/{@code Page} are
 * themselves field-less scaffolding types; the real query implementation
 * is deferred to the DB schema/migrations follow-up task.
 */
public interface ListingModuleApi {

    Page<PublishedListingSummary> findPublished(ListingQuery query);
}
