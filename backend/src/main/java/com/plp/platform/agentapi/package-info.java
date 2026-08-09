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
 * <p>Called <b>only</b> by the Agent Web Next.js server (BFF proxy), never
 * directly by browser JavaScript (module-boundaries.md, "Agent token
 * transport (BFF)" + rule 7) - so this surface carries <b>no CORS
 * configuration</b>. See {@link com.plp.platform.agentapi.SecurityConfig}.
 *
 * <p>B0.2b added the first real wiring: {@link
 * com.plp.platform.agentapi.SecurityConfig} (the app's single Spring
 * Security configuration - see its javadoc for why it lives here rather
 * than a separate package), {@link
 * com.plp.platform.agentapi.AgentAuthenticationFilter} (verifies the bearer
 * token via {@link com.plp.platform.auth.AuthProvider}, resolves/provisions
 * the local agent, enforces {@code DISABLED}/{@code PENDING_APPROVAL}
 * status semantics), and the first endpoint, {@code GET /api/agent/me}
 * ({@link com.plp.platform.agentapi.AgentController}). Listing/media
 * endpoints remain future work.
 */
package com.plp.platform.agentapi;
