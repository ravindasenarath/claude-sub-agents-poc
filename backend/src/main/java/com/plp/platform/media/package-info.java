/**
 * {@code media} module (module-boundaries.md).
 *
 * <p>Owns image upload orchestration (ADR-0003): pre-signed URL issuance,
 * {@code listing_image} metadata ({@code is_primary}, {@code sort_order}),
 * derivative/variant URL logic, and orphaned-object cleanup. Object-storage
 * vendor SDK types must stay behind this module's interface and must never
 * leak into {@code listing}/{@code search} (module-boundaries.md, rule 4).
 *
 * <p>Leaf module: must not depend on {@code agent}, {@code listing}, or
 * {@code search}.
 *
 * <p>Published interface: {@link com.plp.platform.media.api}.
 * Implementation detail: {@link com.plp.platform.media.internal}.
 *
 * <p>The concrete object-storage client wiring (the "object storage seam")
 * is a follow-up task; this scaffolding only establishes the package
 * structure and the boundary rule.
 */
package com.plp.platform.media;
