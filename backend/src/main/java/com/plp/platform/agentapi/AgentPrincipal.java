package com.plp.platform.agentapi;

import com.plp.platform.agent.api.AgentSummary;
import com.plp.platform.auth.AuthProvider.Principal;

/**
 * The resolved caller of an authenticated {@code agent-api} request: the
 * verified identity-provider {@link Principal} (ADR-0002) plus the local
 * {@code agent} record it maps to (module-boundaries.md: authN is
 * delegated, authZ/lifecycle gating is ours).
 *
 * <p>This is the {@linkplain org.springframework.security.core.Authentication#getPrincipal()
 * Authentication principal} set by {@link AgentAuthenticationFilter} once a
 * bearer token has passed verification (via {@code auth.AuthProvider},
 * signature/{@code iss}/{@code aud}/{@code exp}) and been resolved to a
 * local {@code agent} record; controllers under {@code agentapi} read it via
 * {@code @AuthenticationPrincipal}.
 */
record AgentPrincipal(Principal principal, AgentSummary agent) {
}
