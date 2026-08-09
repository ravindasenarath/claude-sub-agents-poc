package com.plp.platform.auth;

import java.util.Optional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * {@link AuthProvider} implementation over Spring Security's OAuth2
 * Resource Server support (ADR-0002, task B0.2b): JWKS-driven signature
 * verification plus {@code iss}/{@code aud}/{@code exp} claim validation
 * (all configured on the shared {@link JwtDecoder}, see {@link AuthConfig}).
 *
 * <p>Only standard OIDC/JWT claim values ever cross back out of this class
 * via {@link Principal} - the {@link Jwt} type itself (a Spring Security
 * library type) never escapes {@code auth} (module-boundaries.md, rule 4).
 */
@Component
class JwtAuthProvider implements AuthProvider {

    private final JwtDecoder jwtDecoder;

    JwtAuthProvider(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Optional<Principal> verify(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) {
            return Optional.empty();
        }
        try {
            Jwt jwt = jwtDecoder.decode(bearerToken);
            return Optional.of(toPrincipal(jwt));
        } catch (JwtException invalidToken) {
            // Missing/invalid signature, expired, wrong iss/aud, malformed -
            // JwtDecoder.decode surfaces all of these as JwtException. Per
            // the AuthProvider contract, that maps to "no principal", not a
            // thrown exception - callers (agentapi.SecurityConfig) turn an
            // empty Optional into 401.
            return Optional.empty();
        }
    }

    private static Principal toPrincipal(Jwt jwt) {
        return new Principal(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
    }
}
