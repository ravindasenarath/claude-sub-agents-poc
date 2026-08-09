/**
 * {@code public-api} HTTP surface (module-boundaries.md).
 *
 * <p>Unauthenticated, read-only endpoints for public visitors: search
 * results and listing detail (FR8-FR13). Must never surface non-
 * {@code PUBLISHED} listings (module-boundaries.md, rule 2).
 *
 * <p>Allowed dependencies: {@code api} packages only of
 * {@link com.plp.platform.search}, {@link com.plp.platform.listing},
 * {@link com.plp.platform.agent}, {@link com.plp.platform.media} (e.g. for
 * listing detail: search result -> {@code getPublishedListing} ->
 * {@code getPublicContact} -> image URLs). Never {@code internal}
 * subpackages, and all search access goes through
 * {@link com.plp.platform.search.api} - no ad-hoc queries here (rule 5).
 *
 * <p>No controllers are added yet - endpoint implementation is out of scope
 * for this scaffolding task (see downstream feature tasks).
 */
package com.plp.platform.publicapi;
