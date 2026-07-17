package com.plp.platform.auth;

/**
 * Seam between the application and the managed identity provider (ADR-0002).
 *
 * <p>The provider owns credential storage, login, password reset and token
 * issuance; this application only ever trusts a verified {@link Principal}
 * produced by an implementation of this interface. No provider SDK type
 * (e.g. an OIDC client library type) is allowed to leak past this interface
 * into {@code agent}, {@code listing}, {@code media}, or {@code search}
 * (module-boundaries.md, rule 4).
 *
 * <p><b>Not implemented yet.</b> Concrete verification (JWT/OIDC signature
 * and claim validation) is the scope of the "auth integration" follow-up
 * task. This scaffolding task only defines the contract.
 */
public interface AuthProvider {

    /**
     * Verifies an incoming bearer token and returns the authenticated
     * principal, or empty if the token is missing/invalid/expired.
     *
     * @param bearerToken the raw bearer token from the {@code Authorization} header
     * @return the verified principal
     */
    java.util.Optional<Principal> verify(String bearerToken);

    /**
     * A verified caller identity, carrying only the stable subject id from
     * the identity provider (module-boundaries.md: {@code auth_subject}).
     * Domain authorization (which agent record this maps to, what they may
     * touch) is resolved by the {@code agent}/{@code listing} modules, not
     * here (ADR-0002: authN is delegated, authZ is owned).
     */
    record Principal(String authSubject) {
    }
}
