package com.plp.platform.agentapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.plp.platform.support.MockOidcIssuer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Security-edge behaviour that does not require a live database (task
 * B0.2b): JWT verification outcomes, the public/actuator regression, and
 * the CORS asymmetry between {@code agent-api} (none) and {@code
 * public-api} (restricted).
 *
 * <p>Uses {@link MockOidcIssuer} - a locally-generated RSA keypair serving
 * a real JWKS HTTP endpoint - bound via {@code @DynamicPropertySource}, so
 * {@code auth.AuthConfig}'s actual {@code NimbusJwtDecoder.withJwkSetUri}
 * path is exercised, with no live vendor dependency and no Docker
 * requirement. Deliberately does not call {@code GET /api/agent/me} with a
 * *valid* token for an unseen subject - that requires a real database to
 * provision/resolve the agent row, and belongs in the Testcontainers-backed
 * {@link AgentApiEndpointIntegrationTest} instead (this class only needs
 * the app context, not Postgres).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AgentApiSecurityIntegrationTest {

    private static final MockOidcIssuer ISSUER = new MockOidcIssuer();

    @DynamicPropertySource
    static void authProperties(DynamicPropertyRegistry registry) {
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

    private final TestRestTemplate restTemplate = new TestRestTemplate();

    // ---------------------------------------------------------------
    // 401 outcomes for /api/agent/**
    // ---------------------------------------------------------------

    @Test
    void missingTokenIsRejectedWith401() {
        ResponseEntity<String> response = getAgentMe(null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void malformedTokenIsRejectedWith401() {
        ResponseEntity<String> response = getAgentMe("not-a-jwt");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void badSignatureIsRejectedWith401() {
        String token = ISSUER.issueTokenWithUntrustedSignature("subject-" + java.util.UUID.randomUUID());

        ResponseEntity<String> response = getAgentMe(token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void expiredTokenIsRejectedWith401() {
        Instant now = Instant.now();
        String token = ISSUER.issueToken(builder -> builder.subject("subject-" + java.util.UUID.randomUUID())
                .issueTime(Date.from(now.minus(30, ChronoUnit.MINUTES)))
                .expirationTime(Date.from(now.minus(15, ChronoUnit.MINUTES))));

        ResponseEntity<String> response = getAgentMe(token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void wrongIssuerIsRejectedWith401() {
        String token = ISSUER.issueToken(builder ->
                builder.subject("subject-" + java.util.UUID.randomUUID()).issuer("https://not-the-configured-issuer.test/"));

        ResponseEntity<String> response = getAgentMe(token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void wrongAudienceIsRejectedWith401() {
        String token = ISSUER.issueToken(builder ->
                builder.subject("subject-" + java.util.UUID.randomUUID()).audience("some-other-api"));

        ResponseEntity<String> response = getAgentMe(token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ---------------------------------------------------------------
    // Regression: public-api / actuator health stay anonymous.
    // ---------------------------------------------------------------

    @Test
    void publicApiIsReachableWithoutAToken() {
        ResponseEntity<String> response =
                restTemplate.getForEntity(url("/api/public/anything"), String.class);

        // No controller exists under /api/public yet (business endpoints
        // are future work) so a *permitAll*, correctly-anonymous request
        // always 404s here - asserting that exact status (rather than only
        // isNotEqualTo(UNAUTHORIZED)) matters: with no explicit
        // AuthenticationEntryPoint configured on this chain, Spring
        // Security's ExceptionTranslationFilter defaults to
        // Http403ForbiddenEntryPoint, so if the permitAll rule for
        // /api/public/** were ever accidentally deleted/tightened the
        // response would become 403, not 401 - and isNotEqualTo(UNAUTHORIZED)
        // alone would not catch that regression.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void actuatorHealthIsReachableWithoutAToken() {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/actuator/health"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    // ---------------------------------------------------------------
    // CORS asymmetry: public-api restricted to the web origin,
    // agent-api carries none at all.
    // ---------------------------------------------------------------

    @Test
    void publicApiSendsCorsHeaderForTheConfiguredWebOrigin() {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.ORIGIN, "http://localhost:3000");

        ResponseEntity<String> response =
                restTemplate.exchange(url("/api/public/anything"), HttpMethod.GET, new HttpEntity<>(headers), String.class);

        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
                .isEqualTo("http://localhost:3000");
    }

    @Test
    void agentApiSendsNoCorsHeaderAtAllEvenForACrossOriginRequest() {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.ORIGIN, "http://localhost:3000");

        ResponseEntity<String> response =
                restTemplate.exchange(url("/api/agent/me"), HttpMethod.GET, new HttpEntity<>(headers), String.class);

        // Unauthenticated (no token), so this 401s regardless - the
        // assertion that matters is the *absence* of any CORS header, not
        // the status code.
        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isNull();
    }

    @Test
    void agentApiDoesNotAnswerACorsPreflightRequest() {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.ORIGIN, "http://localhost:3000");
        headers.add(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET");

        ResponseEntity<String> response =
                restTemplate.exchange(url("/api/agent/me"), HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);

        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isNull();
    }

    private ResponseEntity<String> getAgentMe(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        if (bearerToken != null) {
            headers.setBearerAuth(bearerToken);
        }
        return restTemplate.exchange(url("/api/agent/me"), HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
