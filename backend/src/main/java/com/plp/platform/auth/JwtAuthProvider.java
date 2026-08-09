package com.plp.platform.auth;

import com.nimbusds.jose.RemoteKeySourceException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * {@link AuthProvider} implementation over Spring Security's OAuth2
 * Resource Server support (ADR-0002, task B0.2b): JWKS-driven signature
 * verification plus {@code iss}/{@code aud}/{@code exp} claim validation
 * (all configured on this class's {@link JwtDecoder}, see {@link
 * AuthConfig}). The sole caller of {@link #verify} is {@code
 * agentapi.AgentAuthenticationFilter}; {@code agentapi.SecurityConfig} never
 * calls this class or the decoder directly - it only declares which paths
 * require an authenticated principal.
 *
 * <p>Only standard OIDC/JWT claim values ever cross back out of this class
 * via {@link Principal} - the {@link Jwt} type itself (a Spring Security
 * library type) never escapes {@code auth} (module-boundaries.md, rule 4).
 */
@Component
class JwtAuthProvider implements AuthProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthProvider.class);

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
        } catch (BadJwtException invalidToken) {
            // JwtValidationException (wrong iss/aud/exp) is itself a
            // BadJwtException subtype, so this branch also covers it.
            // Malformed token, expired, wrong iss/aud - expected traffic
            // from a bad/stale client token, not an operational problem.
            // DEBUG: no on-call action needed.
            log.debug(
                    "Rejected invalid JWT ({}): {}",
                    invalidToken.getClass().getSimpleName(),
                    invalidToken.getMessage());
            return Optional.empty();
        } catch (JwtException invalidTokenOrJwksFailure) {
            // NimbusJwtDecoder routes two very different failure classes
            // through this same base JwtException type: a bad signature
            // (a genuinely bad client token) AND a JWKS retrieval/parse
            // failure (unreachable host, wrong auth.jwk-set-uri /
            // AUTH_JWK_SET_URI, malformed JWKS response - the exact class of
            // bug that let a broken mock-issuer JWKS response reach CI as
            // "every request 401s" with nothing distinguishing it from bad
            // client tokens). Unlike the branch above, it does not expose a
            // dedicated exception type for that - but its cause chain does:
            // NimbusJwtDecoder wraps a JWKS-fetch/parse failure's
            // RemoteKeySourceException as the cause, and a bad signature's
            // JOSEException as the cause instead. Use that to log JWKS
            // infra failures at a level that pages someone in production,
            // while still surfacing the ambiguous case (bad signature) at a
            // visible level rather than silently swallowing it.
            if (invalidTokenOrJwksFailure.getCause() instanceof RemoteKeySourceException) {
                log.error(
                        "JWT verification failed because the JWKS document could not be retrieved/parsed "
                                + "(check auth.jwk-set-uri / AUTH_JWK_SET_URI reachability): {}",
                        invalidTokenOrJwksFailure.getMessage(),
                        invalidTokenOrJwksFailure);
            } else {
                log.warn(
                        "Rejected invalid JWT (bad signature, or an unexpected JWT decode failure): {}",
                        invalidTokenOrJwksFailure.getMessage(),
                        invalidTokenOrJwksFailure);
            }
            return Optional.empty();
        }
    }

    private static Principal toPrincipal(Jwt jwt) {
        return new Principal(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
    }
}
