/**
 * {@code agent-api} HTTP surface (module-boundaries.md).
 *
 * <p>Authenticated write endpoints for agents (listing create/edit/status/
 * delete, FR2-FR6; media upload orchestration). Every request must carry a
 * verified principal (via {@link com.plp.platform.auth.AuthProvider});
 * ownership is enforced in the {@code listing}/{@code media} domain layers,
 * not only here (NFR2, module-boundaries.md rule 3).
 *
 * <p>Allowed dependencies: {@code api} packages only of
 * {@link com.plp.platform.agent}, {@link com.plp.platform.listing},
 * {@link com.plp.platform.media}, plus {@link com.plp.platform.auth}. Never
 * {@code internal} subpackages.
 *
 * <p>No controllers or Spring Security configuration are added yet - actual
 * token verification/authorization wiring is the scope of the "auth
 * integration" follow-up task; this scaffolding only reserves the package.
 */
package com.plp.platform.agentapi;
