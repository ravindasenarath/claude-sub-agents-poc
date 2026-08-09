/**
 * Shared authentication seam (ADR-0002).
 *
 * <p>Agent authentication is delegated to a managed third-party identity
 * provider; this package holds the single internal abstraction the rest of
 * the application depends on ({@link com.plp.platform.auth.AuthProvider}) so
 * that no provider SDK type ever leaks into {@code agent}, {@code listing},
 * {@code media}, or {@code search} (module-boundaries.md, rule 4).
 *
 * <p>Implemented (B0.2b) by {@code JwtAuthProvider} over Spring Security's
 * OAuth2 Resource Server support: JWKS-driven signature verification plus
 * {@code iss}/{@code aud}/{@code exp} claim validation ({@code AuthConfig},
 * {@code AuthProperties}, backed by the {@code AUTH_ISSUER_URI}/
 * {@code AUTH_AUDIENCE}/{@code AUTH_JWK_SET_URI} env vars - see
 * backend/README.md). The concrete identity provider is still undecided, so
 * only standard OIDC/JWT library types are used here, never a vendor SDK.
 *
 * <p>Any module may depend on {@code com.plp.platform.auth}; this package
 * must never depend on {@code agent}, {@code listing}, {@code media},
 * {@code search}, {@code publicapi}, or {@code agentapi}.
 */
package com.plp.platform.auth;
