package com.plp.platform.auth;

/**
 * Seam between the application and the managed identity provider (ADR-0002).
 *
 * <p>The provider owns credential storage, login, password reset and token
 * issuance; this application only ever trusts a verified {@link Principal}
 * produced by an implementation of this interface. No provider SDK type
 * (e.g. an OIDC client library type) is allowed to leak past this interface
 * into {@code agent}, {@code listing}, {@code media}, or {@code search}
 * (module-boundaries.md, rule 4) - {@link Principal} carries only plain,
 * standard-OIDC-claim values (never a raw claims map, never a
 * provider/library type such as {@code org.springframework.security.oauth2.
 * jwt.Jwt}).
 *
 * <p>Implemented by {@code JwtAuthProvider} (B0.2b) over Spring Security's
 * OAuth2 Resource Server support: JWKS-driven signature verification plus
 * {@code iss}/{@code aud}/{@code exp} claim validation. The concrete
 * identity provider is still undecided, so the implementation stays on
 * standard OIDC/JWT types only, not a vendor SDK.
 */
public interface AuthProvider {

    /**
     * Verifies an incoming bearer token and returns the authenticated
     * principal, or empty if the token is missing/invalid/expired/has the
     * wrong issuer or audience.
     *
     * @param bearerToken the raw bearer token from the {@code Authorization} header
     * @return the verified principal
     */
    java.util.Optional<Principal> verify(String bearerToken);

    /**
     * A verified caller identity, carrying the stable subject id from the
     * identity provider (module-boundaries.md: {@code auth_subject}) plus
     * the standard OIDC {@code email}/{@code name} claims used to default a
     * newly-provisioned local {@code agent} record (ADR-0002,
     * {@code agent.api.AgentModuleApi#provisionOnFirstLogin}). Domain
     * authorization (which agent record this maps to, what they may touch)
     * is resolved by the {@code agent}/{@code listing} modules, not here
     * (ADR-0002: authN is delegated, authZ is owned).
     *
     * @param authSubject the stable, non-null subject id ({@code sub} claim)
     * @param email        the {@code email} claim; nullable - not every
     *                     token issuer/flow guarantees it
     * @param name         the {@code name} claim; nullable for the same
     *                     reason
     */
    record Principal(String authSubject, String email, String name) {
    }
}
