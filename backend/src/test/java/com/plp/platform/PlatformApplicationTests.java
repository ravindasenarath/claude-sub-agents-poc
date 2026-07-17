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
 * {@code application.yml}: {@code initialization-fail-timeout: -1}). The
 * health endpoint still responds; its {@code db} component simply reports
 * whatever the environment's DB reachability actually is.
 *
 * <p>{@code application-test.yml} (activated via the {@code test} profile)
 * only quiets logging - it must stay a profile-specific file rather than a
 * second {@code application.yml}, otherwise it would shadow (not merge
 * with) {@code src/main/resources/application.yml} on the test classpath.
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

        assertThat(response.getStatusCode()).isIn(HttpStatus.OK, HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).contains("status");
    }
}
