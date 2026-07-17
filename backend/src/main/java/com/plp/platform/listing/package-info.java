/**
 * {@code listing} module (module-boundaries.md).
 *
 * <p>Owns listing lifecycle, ownership, status transitions (FR2-FR6),
 * validation (NFR6) and audit timestamps (NFR7). Enforces authorization
 * (NFR2) in the domain layer: mutations require
 * {@code listing.agent_id == principal.agent_id}, never trusting a
 * client-supplied owner id.
 *
 * <p>Allowed dependencies: {@link com.plp.platform.agent.api} (agent
 * lookups) and {@link com.plp.platform.media.api} (enqueuing image cleanup
 * on delete/withdraw, ADR-0003). Must never depend on {@code search},
 * {@code publicapi}, or {@code agentapi}.
 *
 * <p>Published interface: {@link com.plp.platform.listing.api}.
 * Implementation detail: {@link com.plp.platform.listing.internal}.
 */
package com.plp.platform.listing;
