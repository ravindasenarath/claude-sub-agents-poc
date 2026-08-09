package com.plp.platform.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code auth.*} configuration namespace (see
 * {@code application.yml}), backed by the {@code AUTH_ISSUER_URI}/
 * {@code AUTH_AUDIENCE}/{@code AUTH_JWK_SET_URI}/
 * {@code AUTH_CLOCK_SKEW_SECONDS} environment variables - the same
 * "env var overrides a local-dev default" convention already used for the
 * datasource ({@code DB_HOST} etc., {@code application.yml}) ahead of a
 * concrete identity provider being chosen.
 *
 * <p>{@code issuerUri} and {@code jwkSetUri} are deliberately separate
 * properties rather than relying on Spring Security's OIDC issuer discovery
 * ({@code spring.security.oauth2.resourceserver.jwt.issuer-uri}, which
 * fetches {@code <issuer>/.well-known/openid-configuration}): the concrete
 * identity provider is still undecided (ADR-0002), and the local dev/test
 * mock issuer (see backend/README.md "Auth: local dev / CI") serves a
 * static JWKS document without a discovery endpoint. Validating {@code iss}
 * as a plain claim match (see {@link AuthConfig}) works the same way
 * against any standard OIDC/JWT issuer once one is chosen; only
 * {@code jwk-set-uri} would need to change.
 *
 * @param issuerUri         expected {@code iss} claim value
 * @param audience          expected {@code aud} claim value (must be one of
 *                          the token's audiences)
 * @param jwkSetUri         URL of the issuer's JWKS document (signature
 *                          verification)
 * @param clockSkewSeconds  allowed clock skew for {@code exp}/{@code nbf}
 *                          validation; access tokens are assumed short-lived
 *                          (~15 min, see ADR-0002), so this is kept small
 */
@ConfigurationProperties(prefix = "auth")
public record AuthProperties(String issuerUri, String audience, String jwkSetUri, long clockSkewSeconds) {
}
