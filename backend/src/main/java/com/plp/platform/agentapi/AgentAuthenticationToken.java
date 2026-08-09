package com.plp.platform.agentapi;

import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;

/**
 * The authenticated {@link org.springframework.security.core.Authentication}
 * for a verified {@code agent-api} request: principal is an
 * {@link AgentPrincipal} (verified IdP identity + resolved local agent),
 * never a raw {@code org.springframework.security.oauth2.jwt.Jwt}.
 *
 * <p>No authorities/roles are granted (role/admin modeling is out of scope
 * for v1, requirements section 2) - {@link AgentAuthenticationFilter} makes
 * the sole access decision (blocking {@code DISABLED} agents, see its class
 * javadoc) directly off {@link AgentPrincipal#agent()} before this token is
 * ever set as the request's {@code Authentication}, not off granted
 * authorities.
 */
class AgentAuthenticationToken extends AbstractAuthenticationToken {

    private final AgentPrincipal principal;

    AgentAuthenticationToken(AgentPrincipal principal) {
        super(List.of());
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public AgentPrincipal getPrincipal() {
        return principal;
    }
}
