package com.plp.platform.listing.api;

/**
 * Minimal pagination envelope for {@link ListingModuleApi#findPublished}.
 *
 * <p>Pure scaffolding placeholder: a stand-in for whatever concrete
 * pagination/cursor shape {@code search} settles on (page number, offset,
 * or an opaque cursor) when real query logic is implemented. Deliberately
 * dependency-free (no {@code spring-data-commons}) so {@code listing.api}
 * does not have to take on a new library dependency just to publish this
 * marker signature; revisit once the real pagination policy - owned by
 * {@code search} per the search/DB-access architecture decision - is
 * decided.
 */
public record Page<T>() {
}
