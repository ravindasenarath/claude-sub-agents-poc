/**
 * Published interface of the {@code search} module ({@code SearchService},
 * ADR-0004).
 *
 * <p>All query access (filters, sort, pagination over {@code PUBLISHED}
 * listings) must go through this package - no ad-hoc queries in
 * {@code publicapi} (module-boundaries.md, rule 5).
 *
 * <p>{@link com.plp.platform.search.api.SearchModuleApi} is a scaffolding
 * marker only.
 */
package com.plp.platform.search.api;
