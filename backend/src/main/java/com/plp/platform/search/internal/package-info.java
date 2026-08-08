/**
 * Implementation detail of the {@code search} module: index-backed query
 * repositories, projections, mappers.
 *
 * <p>Nothing outside {@code com.plp.platform.search} may reference classes
 * in this package - enforced by
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (ArchUnit).
 *
 * <p>Empty in this scaffolding task. Per the {@code search} package Javadoc,
 * this package composes results via {@link com.plp.platform.listing.api}'s
 * query port and must never issue SQL against the {@code listing} table
 * itself once the DB schema/migrations task lands.
 */
package com.plp.platform.search.internal;
