package com.plp.platform.agentapi;

import com.plp.platform.agent.api.AgentProfile;
import com.plp.platform.agent.api.AgentStatus;
import java.util.UUID;

/**
 * Response body for {@code GET /api/agent/me} - the signed-in agent's own
 * profile. Its shape is a contract with F0.2's pending-approval banner, so
 * it maps {@link AgentProfile} field-for-field rather than re-exposing the
 * domain type directly:
 *
 * <pre>{@code
 * { "id", "name", "email", "status", "agencyName", "phone" }
 * }</pre>
 *
 * <p>{@code email} here is {@link AgentProfile#contactEmail()} - the domain
 * name reflects data-model.md's {@code contact_email} column; the wire name
 * matches what the frontend consumes.
 */
record AgentMeResponse(UUID id, String name, String email, AgentStatus status, String agencyName, String phone) {

    static AgentMeResponse from(AgentProfile profile) {
        return new AgentMeResponse(
                profile.id(),
                profile.name(),
                profile.contactEmail(),
                profile.status(),
                profile.agencyName(),
                profile.phone());
    }
}
