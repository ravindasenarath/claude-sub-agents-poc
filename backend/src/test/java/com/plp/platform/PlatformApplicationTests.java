package com.plp.platform;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke tests for the scaffolding: the Spring context wires up (modules,
 * config, connection pool) and the actuator health endpoint responds.
 *
 * <p>No live PostgreSQL instance is required for these tests - the
 * Hikari-backed {@code DataSource} bean is created eagerly, but a
 * connection is only requested lazily on first use (see
 * {@code application.yml}: {@code initialization-fail-timeout: -1}).
 * {@code application-test.yml} additionally disables the actuator
 * {@code db} health indicator, so the overall health status this test
 * asserts on is deterministic (always {@code UP}) rather than a function
 * of whatever PostgreSQL happens to be reachable in the environment the
 * tests run in.
 *
 * <p>{@code application-test.yml} (activated via the {@code test} profile)
 * must stay a profile-specific file rather than a second
 * {@code application.yml}, otherwise it would shadow (not merge with)
 * {@code src/main/resources/application.yml} on the test classpath.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PlatformApplicationTests {

    @LocalServerPort
    private int port;

    @Test
    void contextLoads() {
        // If the modular monolith's Spring context (all modules + config)
        // fails to wire up, this test fails during @SpringBootTest startup.
    }

    @Test
    void healthEndpointIsUp() {
        var restTemplate = new TestRestTemplate();
        ResponseEntity<String> response =
                restTemplate.getForEntity("http://localhost:" + port + "/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }
}
