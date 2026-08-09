package com.plp.platform.agentapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.plp.platform.agent.api.AgentStatus;
import com.plp.platform.support.MockOidcIssuer;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * End-to-end {@code GET /api/agent/me} behaviour that needs a real,
 * migrated database (principal -> local {@code agent} resolution/
 * provisioning, lifecycle status enforcement): task B0.2b acceptance
 * criteria.
 *
 * <p><b>Requires a working Docker (or compatible) daemon</b> - same
 * constraint as {@code agent.internal.JdbcAgentModuleApiTest}
 * (B0.2a); see {@code AbstractPostgresIntegrationTest}. Split out from
 * {@link AgentApiSecurityIntegrationTest} (which needs no database) so the
 * no-token/bad-token/CORS assertions can still run in environments without
 * Docker.
 *
 * <p>Unlike {@code AbstractPostgresIntegrationTest}, this boots a full
 * {@code @SpringBootTest} context (controllers, security filter chain) -
 * not just a bare {@code JdbcTemplate} - against the Testcontainers
 * Postgres instance, with the real ({@code default}) profile so
 * {@code spring.flyway} actually migrates the schema.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AgentApiEndpointIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("plp_agentapi_test")
            .withUsername("plp_agentapi_test")
            .withPassword("plp_agentapi_test");

    private static final MockOidcIssuer ISSUER = new MockOidcIssuer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("auth.issuer-uri", ISSUER::issuer);
        registry.add("auth.audience", ISSUER::audience);
        registry.add("auth.jwk-set-uri", ISSUER::jwkSetUri);
    }

    @AfterAll
    static void stopIssuer() {
        ISSUER.close();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final TestRestTemplate restTemplate = new TestRestTemplate();

    @Test
    void validTokenForAnUnseenSubjectProvisionsExactlyOneAgentAndReturnsItsProfile() {
        String subject = "subject-" + UUID.randomUUID();
        String token = ISSUER.issueToken(subject);

        ResponseEntity<AgentMeResponse> response = getAgentMe(token, AgentMeResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        AgentMeResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.id()).isNotNull();
        assertThat(body.email()).isEqualTo(subject + "@example.com");
        assertThat(body.name()).isEqualTo("Test Agent");
        assertThat(body.status()).isEqualTo(AgentStatus.PENDING_APPROVAL);
        assertThat(body.agencyName()).isNull();
        assertThat(body.phone()).isNull();

        Integer rowCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM agent WHERE auth_subject = ?", Integer.class, subject);
        assertThat(rowCount).as("exactly one agent row must be provisioned").isEqualTo(1);
    }

    @Test
    void pendingApprovalAgentIsAllowedThrough() {
        // Provisioning defaults to PENDING_APPROVAL (B0.2a) - a fresh
        // subject's first call already exercises the "allowed through, not
        // blocked" requirement; asserted explicitly here as its own test
        // for clarity against the acceptance criteria.
        String subject = "subject-" + UUID.randomUUID();
        String token = ISSUER.issueToken(subject);

        ResponseEntity<AgentMeResponse> response = getAgentMe(token, AgentMeResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().status()).isEqualTo(AgentStatus.PENDING_APPROVAL);
    }

    @Test
    void activeAgentIsAllowedThroughAndProfileReflectsActiveStatus() {
        String subject = "subject-" + UUID.randomUUID();
        String token = ISSUER.issueToken(subject);
        getAgentMe(token, String.class); // provision

        jdbcTemplate.update("UPDATE agent SET status = 'ACTIVE' WHERE auth_subject = ?", subject);

        ResponseEntity<AgentMeResponse> response = getAgentMe(token, AgentMeResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().status()).isEqualTo(AgentStatus.ACTIVE);
    }

    @Test
    void disabledAgentIsRejectedWith403AndAgentDisabledCode() {
        String subject = "subject-" + UUID.randomUUID();
        String token = ISSUER.issueToken(subject);
        getAgentMe(token, String.class); // provision

        jdbcTemplate.update("UPDATE agent SET status = 'DISABLED' WHERE auth_subject = ?", subject);

        ResponseEntity<String> response = getAgentMe(token, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).contains("AGENT_DISABLED");
    }

    private <T> ResponseEntity<T> getAgentMe(String bearerToken, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);
        return restTemplate.exchange(
                "http://localhost:" + port + "/api/agent/me", HttpMethod.GET, new HttpEntity<>(headers), responseType);
    }
}
