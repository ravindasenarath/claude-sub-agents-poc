package com.plp.platform.agent.api;

import java.util.UUID;

/**
 * Minimal, published projection of an {@code agent} record.
 *
 * <p>Carries only what other modules need without exposing the full
 * profile row (name, agency, phone, contact email, photo key are internal
 * to {@code agent}; {@code getPublicContact}-style access for FR15 is a
 * separate, future concern). In particular this is the shape the future
 * {@code listing} module (already permitted by {@code ModuleBoundaryTest}
 * to depend on {@code agent.api}) will use to gate publish transitions on
 * {@link AgentStatus} - that enforcement itself is out of scope here; this
 * type is just the port it will read.
 *
 * @param id     the agent's local primary key
 * @param status the agent's current lifecycle status
 */
public record AgentSummary(UUID id, AgentStatus status) {
}
