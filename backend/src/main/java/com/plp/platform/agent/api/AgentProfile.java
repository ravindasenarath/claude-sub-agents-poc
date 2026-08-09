package com.plp.platform.agent.api;

import java.util.UUID;

/**
 * Fuller, published projection of an {@code agent} record - the agent's own
 * profile (FR14), as opposed to {@link AgentSummary}'s narrower
 * {@code id}/{@code status} pair that other modules (future {@code listing})
 * use only to gate publish transitions.
 *
 * <p>Added in B0.2b for {@code GET /api/agent/me}: the endpoint the agent
 * web frontend (F0.2) uses to render the signed-in agent's own profile,
 * including a pending-approval banner driven by {@link #status()}. Does not
 * replace {@link AgentSummary} - callers that only need identity/status
 * keep using that narrower type.
 *
 * <p>{@code agencyName}/{@code phone} are nullable (data-model.md: completed
 * later via profile editing, not a forced onboarding gate - profile
 * *editing* itself is out of scope for B0.2b, FR14 future work).
 *
 * @param id          the agent's local primary key
 * @param name        display name (never null - {@code agent.name} is
 *                    {@code NOT NULL}, defaulted at provisioning time)
 * @param contactEmail contact email (never null - {@code agent.contact_email}
 *                    is {@code NOT NULL}, defaulted from the IdP login email
 *                    at provisioning time)
 * @param status      the agent's current lifecycle status
 * @param agencyName  agency name; nullable, not set at provisioning
 * @param phone       phone number; nullable, not set at provisioning
 */
public record AgentProfile(
        UUID id, String name, String contactEmail, AgentStatus status, String agencyName, String phone) {
}
