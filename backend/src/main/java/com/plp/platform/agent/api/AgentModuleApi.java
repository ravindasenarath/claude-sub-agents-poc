package com.plp.platform.agent.api;

import java.util.Optional;

/**
 * Published interface of the {@code agent} module (module-boundaries.md).
 * Other modules and the {@code publicapi}/{@code agentapi} HTTP surfaces
 * may depend on this package only - never on {@code agent.internal}.
 *
 * <p>Implemented by {@code agent.internal.JdbcAgentModuleApi} (plain JDBC,
 * no JPA/Hibernate). B0.2a shipped the persistence port
 * ({@link #getByAuthSubject}/{@link #provisionOnFirstLogin}); B0.2b wires
 * real auth on top of it and adds {@link #getProfileByAuthSubject} for the
 * {@code GET /api/agent/me} endpoint.
 */
public interface AgentModuleApi {

    /**
     * Looks up the local agent record for a verified identity-provider
     * subject id (ADR-0002: {@code auth_subject}).
     *
     * @param authSubject the stable subject id from the managed IdP
     * @return the agent's summary, or empty if no local record exists yet
     *     for this subject (i.e. {@link #provisionOnFirstLogin} has not
     *     been called for it)
     */
    Optional<AgentSummary> getByAuthSubject(String authSubject);

    /**
     * Looks up the full profile (FR14) of the local agent record for a
     * verified identity-provider subject id - the fuller counterpart to
     * {@link #getByAuthSubject}, added for {@code GET /api/agent/me}
     * (B0.2b).
     *
     * @param authSubject the stable subject id from the managed IdP
     * @return the agent's profile, or empty if no local record exists yet
     *     for this subject
     */
    Optional<AgentProfile> getProfileByAuthSubject(String authSubject);

    /**
     * Idempotently provisions the local {@code agent} record the first
     * time a subject authenticates (ADR-0002).
     *
     * <p>If a row already exists for {@code authSubject}, it is returned
     * unchanged - this method never overwrites an existing agent's fields,
     * so it is safe to call on every login, not just the first one. If no
     * row exists, a new one is inserted with
     * {@link AgentStatus#PENDING_APPROVAL}, {@code contact_email} set to
     * {@code email}, and {@code name} derived from {@code name} with a
     * fallback (e.g. the email local-part) since the column is
     * {@code NOT NULL}; {@code agency_name}/{@code phone} are left null
     * (completed later via profile edit - no forced onboarding).
     *
     * <p>Race-safe: if two concurrent calls for the same brand-new
     * {@code authSubject} both attempt to provision, exactly one row is
     * created and both calls return that same row.
     *
     * @param authSubject the stable subject id from the managed IdP
     * @param email       the IdP login email, used to default {@code contact_email}
     *                    (and as a name fallback) - only on first provisioning
     * @param name        the IdP-supplied display name, used to default
     *                    {@code name} - only on first provisioning; may be
     *                    null/blank, in which case a fallback derived from
     *                    {@code email} is used instead
     * @return the existing or newly provisioned agent's summary
     */
    AgentSummary provisionOnFirstLogin(String authSubject, String email, String name);
}
