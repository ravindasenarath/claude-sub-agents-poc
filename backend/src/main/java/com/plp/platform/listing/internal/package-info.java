/**
 * Implementation detail of the {@code listing} module: entities, Spring Data
 * repositories, status-transition rules, mappers.
 *
 * <p>Nothing outside {@code com.plp.platform.listing} may reference classes
 * in this package - enforced by
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (ArchUnit).
 *
 * <p>Empty in this scaffolding task; the DB schema/migrations follow-up task
 * adds the {@code listing} table mapping described in
 * {@code docs/architecture/data-model.md}, plus the
 * {@link com.plp.platform.listing.api.ListingModuleApi#findPublished}
 * implementation - one index-backed SQL statement filtering
 * {@code status = 'PUBLISHED'} - which is how {@code search} reads listing
 * data (it may not query this module's table directly).
 */
package com.plp.platform.listing.internal;
