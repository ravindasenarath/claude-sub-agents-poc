package com.plp.platform.support;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;
import java.util.function.UnaryOperator;

/**
 * In-process mock OIDC issuer for integration tests (task B0.2b): a
 * locally-generated RSA keypair signs JWTs, and a JWKS document is served
 * over a real (loopback) HTTP endpoint from an ephemeral port, so tests
 * exercise {@code AuthConfig}'s actual JWKS-driven verification path
 * ({@code NimbusJwtDecoder.withJwkSetUri}) rather than a hand-rolled
 * shortcut - with no live vendor/network dependency and no Docker
 * requirement (unlike the Testcontainers-backed persistence tests, see
 * {@code AbstractPostgresIntegrationTest}).
 *
 * <p>Usage: start once per test class (e.g. a static field), bind {@code
 * auth.issuer-uri}/{@code auth.audience}/{@code auth.jwk-set-uri} to
 * {@link #issuer()}/{@link #audience()}/{@link #jwkSetUri()} via {@code
 * @DynamicPropertySource}, then call {@link #issueToken(UnaryOperator)} (or
 * the convenience overloads) to mint tokens for specific test scenarios
 * (valid, expired, wrong issuer/audience, unsigned-by-a-different-key).
 * Call {@link #close()} (e.g. in an {@code @AfterAll}) to stop the embedded
 * HTTP server.
 */
public final class MockOidcIssuer implements AutoCloseable {

    public static final String DEFAULT_ISSUER = "https://mock-issuer.test/";
    public static final String DEFAULT_AUDIENCE = "plp-agent-api-test";

    private final RSAKey signingKey;
    private final RSAKey untrustedKey;
    private final HttpServer httpServer;
    private final String issuer;
    private final String audience;

    public MockOidcIssuer() {
        this(DEFAULT_ISSUER, DEFAULT_AUDIENCE);
    }

    public MockOidcIssuer(String issuer, String audience) {
        this.issuer = issuer;
        this.audience = audience;
        this.signingKey = generateRsaKey();
        // A second key, never published in the served JWKS document, used
        // to mint tokens that must fail signature verification.
        this.untrustedKey = generateRsaKey();
        this.httpServer = startJwksServer(signingKey);
    }

    public String issuer() {
        return issuer;
    }

    public String audience() {
        return audience;
    }

    public String jwkSetUri() {
        return "http://localhost:" + httpServer.getAddress().getPort() + "/jwks";
    }

    /** A valid token for the given subject, with default email/name claims. */
    public String issueToken(String subject) {
        return issueToken(builder -> builder.subject(subject)
                .claim("email", subject + "@example.com")
                .claim("name", "Test Agent"));
    }

    /**
     * A valid token, fully customised via {@code customizer} (issuer,
     * audience, subject, issued/expiry times default to sane valid values
     * below, which the customizer may override to build negative-test
     * tokens - e.g. an already-expired {@code exp}).
     */
    public String issueToken(UnaryOperator<JWTClaimsSet.Builder> customizer) {
        return issueToken(customizer, signingKey);
    }

    /** A token signed by a key never published in this issuer's JWKS document. */
    public String issueTokenWithUntrustedSignature(String subject) {
        return issueToken(builder -> builder.subject(subject), untrustedKey);
    }

    private String issueToken(UnaryOperator<JWTClaimsSet.Builder> customizer, RSAKey key) {
        Instant now = Instant.now();
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .audience(audience)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(15, ChronoUnit.MINUTES)));
        JWTClaimsSet claims = customizer.apply(builder).build();

        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(key));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("failed to sign mock JWT", e);
        }
    }

    @Override
    public void close() {
        httpServer.stop(0);
    }

    private static RSAKey generateRsaKey() {
        try {
            return new RSAKeyGenerator(2048)
                    .keyID(UUID.randomUUID().toString())
                    .generate();
        } catch (Exception e) {
            throw new IllegalStateException("failed to generate mock RSA keypair", e);
        }
    }

    private static HttpServer startJwksServer(RSAKey signingKey) {
        try {
            // JWKSet#toJSONObject() returns a plain java.util.Map, so
            // .toString() on it produces Map's "{key=value}" debug format -
            // not valid JSON - which NimbusJwtDecoder's JWKS parser then
            // rejects ("Malformed Jwk set" / "Invalid JSON object").
            // JWKSet#toString() serialises to actual JSON directly; use
            // that instead.
            byte[] jwksBody = new JWKSet(signingKey.toPublicJWK())
                    .toString()
                    .getBytes(StandardCharsets.UTF_8);

            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/jwks", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jwksBody.length);
                try (OutputStream body = exchange.getResponseBody()) {
                    body.write(jwksBody);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException("failed to start mock JWKS HTTP server", e);
        }
    }
}
