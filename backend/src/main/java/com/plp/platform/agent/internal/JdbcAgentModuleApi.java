package com.plp.platform.agent.internal;

import com.plp.platform.agent.api.AgentModuleApi;
import com.plp.platform.agent.api.AgentStatus;
import com.plp.platform.agent.api.AgentSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Plain-JDBC implementation of {@link AgentModuleApi} against the
 * {@code agent} table ({@code V1__agent.sql}). No JPA/Hibernate, consistent
 * with the rest of this codebase's {@code spring-boot-starter-jdbc}
 * scaffolding.
 */
@Repository
class JdbcAgentModuleApi implements AgentModuleApi {

    private static final RowMapper<Agent> AGENT_ROW_MAPPER = JdbcAgentModuleApi::mapRow;

    private final JdbcTemplate jdbcTemplate;

    JdbcAgentModuleApi(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<AgentSummary> getByAuthSubject(String authSubject) {
        return findByAuthSubject(authSubject).map(JdbcAgentModuleApi::toSummary);
    }

    @Override
    public AgentSummary provisionOnFirstLogin(String authSubject, String email, String name) {
        Optional<Agent> existing = findByAuthSubject(authSubject);
        if (existing.isPresent()) {
            // Already provisioned - never overwrite an existing agent's
            // fields on a later login.
            return toSummary(existing.get());
        }

        UUID id = UUID.randomUUID();
        String resolvedName = resolveName(name, email);
        OffsetDateTime now = OffsetDateTime.now();

        // Race-safe idempotent insert: if a concurrent first login for the
        // same brand-new auth_subject already won, the UNIQUE constraint
        // (agent_auth_subject_key) makes this a no-op instead of an error,
        // and we fall through to re-reading the winner's row below rather
        // than overwriting it.
        int rowsInserted = jdbcTemplate.update(
                """
                INSERT INTO agent (
                    id, auth_subject, name, contact_email, status, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (auth_subject) DO NOTHING
                """,
                id,
                authSubject,
                resolvedName,
                email,
                AgentStatus.PENDING_APPROVAL.name(),
                now,
                now);

        if (rowsInserted == 1) {
            return new AgentSummary(id, AgentStatus.PENDING_APPROVAL);
        }

        return findByAuthSubject(authSubject)
                .map(JdbcAgentModuleApi::toSummary)
                .orElseThrow(() -> new IllegalStateException(
                        "agent row for auth_subject=" + authSubject
                                + " not found after ON CONFLICT DO NOTHING - concurrent insert should"
                                + " have produced exactly one row"));
    }

    private Optional<Agent> findByAuthSubject(String authSubject) {
        List<Agent> rows = jdbcTemplate.query(
                """
                SELECT id, auth_subject, name, agency_name, phone, contact_email,
                       profile_photo_key, status, approved_at, disabled_at,
                       created_at, updated_at
                FROM agent
                WHERE auth_subject = ?
                """,
                AGENT_ROW_MAPPER,
                authSubject);
        return rows.stream().findFirst();
    }

    /**
     * Derives a {@code NOT NULL name} when the IdP-supplied display name is
     * missing/blank, falling back to the email local-part (e.g.
     * {@code "jane.doe"} from {@code "jane.doe@example.com"}), and finally
     * to a fixed placeholder if even that is unusable.
     */
    private static String resolveName(String name, String email) {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        if (email != null) {
            String localPart = email.split("@", 2)[0].trim();
            if (!localPart.isBlank()) {
                return localPart;
            }
        }
        return "agent";
    }

    private static AgentSummary toSummary(Agent agent) {
        return new AgentSummary(agent.id(), agent.status());
    }

    private static Agent mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new Agent(
                UUID.fromString(rs.getString("id")),
                rs.getString("auth_subject"),
                rs.getString("name"),
                rs.getString("agency_name"),
                rs.getString("phone"),
                rs.getString("contact_email"),
                rs.getString("profile_photo_key"),
                AgentStatus.valueOf(rs.getString("status")),
                rs.getObject("approved_at", OffsetDateTime.class),
                rs.getObject("disabled_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class));
    }
}
