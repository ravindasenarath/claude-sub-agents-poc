package com.plp.platform.agent.internal;

import static org.assertj.core.api.Assertions.assertThat;

import com.plp.platform.AbstractPostgresIntegrationTest;
import com.plp.platform.agent.api.AgentStatus;
import com.plp.platform.agent.api.AgentSummary;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/**
 * Behavioural tests for {@link JdbcAgentModuleApi} against a real,
 * Testcontainers-backed Postgres: lookup, idempotent first-login
 * provisioning (including the {@code name} fallback), and race-safety
 * under concurrent first logins for the same brand-new
 * {@code auth_subject}.
 */
class JdbcAgentModuleApiTest extends AbstractPostgresIntegrationTest {

    private final JdbcAgentModuleApi agentModuleApi = new JdbcAgentModuleApi(jdbcTemplate);

    @Test
    void getByAuthSubjectIsEmptyForAnUnknownSubject() {
        Optional<AgentSummary> result = agentModuleApi.getByAuthSubject("unknown-subject-" + UUID.randomUUID());

        assertThat(result).isEmpty();
    }

    @Test
    void provisionOnFirstLoginCreatesAPendingApprovalAgent() {
        String authSubject = "subject-" + UUID.randomUUID();

        AgentSummary summary = agentModuleApi.provisionOnFirstLogin(authSubject, "jane.doe@example.com", "Jane Doe");

        assertThat(summary.id()).isNotNull();
        assertThat(summary.status()).isEqualTo(AgentStatus.PENDING_APPROVAL);

        Agent row = fetchRow(authSubject);
        assertThat(row.name()).isEqualTo("Jane Doe");
        assertThat(row.contactEmail()).isEqualTo("jane.doe@example.com");
        assertThat(row.agencyName()).isNull();
        assertThat(row.phone()).isNull();
        assertThat(row.status()).isEqualTo(AgentStatus.PENDING_APPROVAL);
        assertThat(row.createdAt()).isNotNull();
        assertThat(row.updatedAt()).isNotNull();
    }

    @Test
    void provisionOnFirstLoginFallsBackToEmailLocalPartWhenNameIsBlank() {
        String authSubject = "subject-" + UUID.randomUUID();

        agentModuleApi.provisionOnFirstLogin(authSubject, "jane.doe@example.com", "   ");

        assertThat(fetchRow(authSubject).name()).isEqualTo("jane.doe");
    }

    @Test
    void provisionOnFirstLoginFallsBackToEmailLocalPartWhenNameIsNull() {
        String authSubject = "subject-" + UUID.randomUUID();

        agentModuleApi.provisionOnFirstLogin(authSubject, "jane.doe@example.com", null);

        assertThat(fetchRow(authSubject).name()).isEqualTo("jane.doe");
    }

    @Test
    void provisionOnFirstLoginIsIdempotentAndDoesNotOverwriteAnExistingRow() {
        String authSubject = "subject-" + UUID.randomUUID();

        AgentSummary first = agentModuleApi.provisionOnFirstLogin(authSubject, "jane.doe@example.com", "Jane Doe");
        AgentSummary second =
                agentModuleApi.provisionOnFirstLogin(authSubject, "someone-else@example.com", "Someone Else");

        assertThat(second).isEqualTo(first);

        Agent row = fetchRow(authSubject);
        assertThat(row.name()).isEqualTo("Jane Doe");
        assertThat(row.contactEmail()).isEqualTo("jane.doe@example.com");
    }

    @Test
    void getByAuthSubjectReturnsTheProvisionedAgent() {
        String authSubject = "subject-" + UUID.randomUUID();
        AgentSummary provisioned = agentModuleApi.provisionOnFirstLogin(authSubject, "jane.doe@example.com", "Jane");

        Optional<AgentSummary> found = agentModuleApi.getByAuthSubject(authSubject);

        assertThat(found).contains(provisioned);
    }

    @Test
    void concurrentFirstLoginsForTheSameSubjectProduceExactlyOneRow() throws Exception {
        String authSubject = "concurrent-subject-" + UUID.randomUUID();
        int callers = 8;

        ExecutorService executor = Executors.newFixedThreadPool(callers);
        CountDownLatch readyLatch = new CountDownLatch(callers);
        CountDownLatch startLatch = new CountDownLatch(1);

        try {
            List<Callable<AgentSummary>> tasks = IntStream.range(0, callers)
                    .<Callable<AgentSummary>>mapToObj(i -> () -> {
                        readyLatch.countDown();
                        startLatch.await();
                        return agentModuleApi.provisionOnFirstLogin(
                                authSubject, "race@example.com", "Race Condition");
                    })
                    .collect(Collectors.toList());

            List<Future<AgentSummary>> futures = tasks.stream().map(executor::submit).collect(Collectors.toList());

            // Wait for every task to be running, then release them all at
            // once to maximise the chance of a genuine race on insert.
            readyLatch.await(10, TimeUnit.SECONDS);
            startLatch.countDown();

            List<AgentSummary> results = new java.util.ArrayList<>();
            for (Future<AgentSummary> future : futures) {
                results.add(future.get(10, TimeUnit.SECONDS));
            }

            Set<UUID> distinctIds = results.stream().map(AgentSummary::id).collect(Collectors.toSet());
            assertThat(distinctIds).as("every concurrent call must resolve to the same agent id").hasSize(1);
            assertThat(results)
                    .as("every concurrent call must see PENDING_APPROVAL")
                    .allMatch(summary -> summary.status() == AgentStatus.PENDING_APPROVAL);

            Integer rowCount = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM agent WHERE auth_subject = ?", Integer.class, authSubject);
            assertThat(rowCount).as("exactly one row must exist for the auth_subject").isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private Agent fetchRow(String authSubject) {
        List<Agent> rows = jdbcTemplate.query(
                """
                SELECT id, auth_subject, name, agency_name, phone, contact_email,
                       profile_photo_key, status, approved_at, disabled_at,
                       created_at, updated_at
                FROM agent
                WHERE auth_subject = ?
                """,
                (rs, rowNum) -> new Agent(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("auth_subject"),
                        rs.getString("name"),
                        rs.getString("agency_name"),
                        rs.getString("phone"),
                        rs.getString("contact_email"),
                        rs.getString("profile_photo_key"),
                        AgentStatus.valueOf(rs.getString("status")),
                        rs.getObject("approved_at", java.time.OffsetDateTime.class),
                        rs.getObject("disabled_at", java.time.OffsetDateTime.class),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        rs.getObject("updated_at", java.time.OffsetDateTime.class)),
                authSubject);

        assertThat(rows).hasSize(1);
        return rows.get(0);
    }
}
