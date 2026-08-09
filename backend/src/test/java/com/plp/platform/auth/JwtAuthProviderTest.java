package com.plp.platform.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.plp.platform.support.MockOidcIssuer;
import java.util.Optional;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;

/**
 * Fast, Spring-context-free regression test (PR #8 review, task B0.2b): a
 * JWT signed for {@link MockOidcIssuer} must decode successfully through the
 * real {@code NimbusJwtDecoder.withJwkSetUri} path this class wires
 * ({@link AuthConfig#jwtDecoder}).
 *
 * <p>This exists specifically because the full {@code
 * AgentApiSecurityIntegrationTest} suite only ever expects {@code 401} for
 * every negative case it exercises - it does not (and, without a database to
 * provision/resolve an agent record, cannot) assert that a *valid* token
 * decodes successfully end to end. That gap is exactly what let a broken
 * {@link MockOidcIssuer} JWKS response (serialised via {@code Map.toString()}
 * instead of real JSON) reach CI undetected: every test in that suite still
 * "passed", because malformed-JWKS-driven 401s look identical to
 * intentional, expected 401s. This test decodes directly against the
 * issuer's real JWKS HTTP endpoint, independent of the full agent-api
 * request flow, so a broken JWKS document fails here in milliseconds with an
 * unambiguous "the mock issuer's JWKS is not decodable" signal.
 */
class JwtAuthProviderTest {

    private static final MockOidcIssuer ISSUER = new MockOidcIssuer();

    private final JwtAuthProvider provider = new JwtAuthProvider(new AuthConfig()
            .jwtDecoder(new AuthProperties(ISSUER.issuer(), ISSUER.audience(), ISSUER.jwkSetUri(), 5)));

    @AfterAll
    static void stopIssuer() {
        ISSUER.close();
    }

    @Test
    void decodesAValidTokenIssuedByTheMockIssuer() {
        String token = ISSUER.issueToken("subject-under-test");

        Optional<AuthProvider.Principal> principal = provider.verify(token);

        assertThat(principal).isPresent();
        assertThat(principal.get().authSubject()).isEqualTo("subject-under-test");
        assertThat(principal.get().email()).isEqualTo("subject-under-test@example.com");
        assertThat(principal.get().name()).isEqualTo("Test Agent");
    }

    @Test
    void rejectsATokenSignedByAKeyNotInTheIssuersJwks() {
        String token = ISSUER.issueTokenWithUntrustedSignature("subject-under-test");

        Optional<AuthProvider.Principal> principal = provider.verify(token);

        assertThat(principal).isEmpty();
    }
}
