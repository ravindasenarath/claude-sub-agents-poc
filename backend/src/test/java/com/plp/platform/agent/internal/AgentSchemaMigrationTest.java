package com.plp.platform.agent.internal;

import static org.assertj.core.api.Assertions.assertThat;

import com.plp.platform.AbstractPostgresIntegrationTest;
import org.junit.jupiter.api.Test;

/**
 * Asserts that {@code V1__agent.sql} applies cleanly to a real Postgres
 * (via Testcontainers, {@link AbstractPostgresIntegrationTest}) and
 * produces the schema B0.2a specifies: the {@code agent} table, the
 * {@code auth_subject} unique constraint, and the {@code status} column's
 * default.
 */
class AgentSchemaMigrationTest extends AbstractPostgresIntegrationTest {

    @Test
    void agentTableExists() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'agent'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
    }

    @Test
    void authSubjectHasAUniqueConstraint() {
        Integer uniqueConstraintCount = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = 'public'
                  AND tc.table_name = 'agent'
                  AND tc.constraint_type = 'UNIQUE'
                  AND kcu.column_name = 'auth_subject'
                """,
                Integer.class);

        assertThat(uniqueConstraintCount).isEqualTo(1);
    }

    @Test
    void statusColumnDefaultsToPendingApproval() {
        String columnDefault = jdbcTemplate.queryForObject(
                """
                SELECT column_default FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'agent' AND column_name = 'status'
                """,
                String.class);

        assertThat(columnDefault).contains("PENDING_APPROVAL");
    }

    @Test
    void statusColumnIsNotNull() {
        String isNullable = jdbcTemplate.queryForObject(
                """
                SELECT is_nullable FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'agent' AND column_name = 'status'
                """,
                String.class);

        assertThat(isNullable).isEqualTo("NO");
    }
}
