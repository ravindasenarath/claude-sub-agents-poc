/**
 * Shared authentication seam (ADR-0002).
 *
 * <p>Agent authentication is delegated to a managed third-party identity
 * provider; this package holds the single internal abstraction the rest of
 * the application depends on ({@link com.plp.platform.auth.AuthProvider}) so
 * that no provider SDK type ever leaks into {@code agent}, {@code listing},
 * {@code media}, or {@code search} (module-boundaries.md, rule 4).
 *
 * <p>This package intentionally has <b>no implementation</b> yet - wiring a
 * concrete provider (token verification, JWKS, etc.) is the scope of the
 * "auth integration" follow-up task, not this scaffolding task.
 *
 * <p>Any module may depend on {@code com.plp.platform.auth}; this package
 * must never depend on {@code agent}, {@code listing}, {@code media},
 * {@code search}, {@code publicapi}, or {@code agentapi}.
 */
package com.plp.platform.auth;
