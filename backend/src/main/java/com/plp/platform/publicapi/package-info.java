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
 *
 * <p>Since B0.2b, {@code /api/public/**} is explicitly {@code permitAll}'d
 * and CORS-enabled (restricted to the web origin, credentials disabled) in
 * {@link com.plp.platform.agentapi.SecurityConfig} - the app's single
 * Spring Security configuration (see that class's javadoc for why it lives
 * in {@code agentapi} rather than here or a separate package). This package
 * itself has no Spring Security dependency.
 */
package com.plp.platform.publicapi;
