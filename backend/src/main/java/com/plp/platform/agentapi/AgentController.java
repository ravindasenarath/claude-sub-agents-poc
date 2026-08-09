package com.plp.platform.agentapi;

import com.plp.platform.agent.api.AgentModuleApi;
import com.plp.platform.agent.api.AgentProfile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code agent-api} agent-profile endpoints (task B0.2b).
 *
 * <p>Only {@code GET /api/agent/me} is in scope here - profile *editing*
 * (FR14) and {@code getPublicContact} (FR15, public listing detail) are
 * explicitly out of scope, per the tech lead's B0.2a review and this task's
 * brief.
 */
@RestController
@RequestMapping("/api/agent")
class AgentController {

    private final AgentModuleApi agentModuleApi;

    AgentController(AgentModuleApi agentModuleApi) {
        this.agentModuleApi = agentModuleApi;
    }

    /**
     * Returns the authenticated caller's own agent profile. Reachable by
     * agents in any {@link com.plp.platform.agent.api.AgentStatus},
     * including {@code PENDING_APPROVAL} - the response's {@code status}
     * field is exactly what drives F0.2's pending-approval banner. Callers
     * whose token failed verification, or whose resolved agent is
     * {@code DISABLED}, never reach this method
     * ({@link AgentAuthenticationFilter} rejects them with 401/403 first).
     */
    @GetMapping("/me")
    AgentMeResponse me(@AuthenticationPrincipal AgentPrincipal agentPrincipal) {
        AgentProfile profile = agentModuleApi
                .getProfileByAuthSubject(agentPrincipal.principal().authSubject())
                .orElseThrow(() -> new IllegalStateException(
                        "agent-api authenticated request for auth_subject="
                                + agentPrincipal.principal().authSubject()
                                + " but no agent profile found - AgentAuthenticationFilter should have"
                                + " provisioned/resolved one before reaching this controller"));
        return AgentMeResponse.from(profile);
    }
}
