/**
 * Implementation detail of the {@code media} module: entities, Spring Data
 * repositories, object-storage client wiring.
 *
 * <p>Nothing outside {@code com.plp.platform.media} may reference classes in
 * this package - enforced by
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (ArchUnit).
 *
 * <p>Empty in this scaffolding task; the "object storage seam" follow-up
 * task adds the S3-compatible client and the {@code listing_image} mapping
 * described in {@code docs/architecture/data-model.md}.
 */
package com.plp.platform.media.internal;
