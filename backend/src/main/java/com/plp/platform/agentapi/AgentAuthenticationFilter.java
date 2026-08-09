package com.plp.platform.agentapi;

import com.plp.platform.agent.api.AgentModuleApi;
import com.plp.platform.agent.api.AgentStatus;
import com.plp.platform.agent.api.AgentSummary;
import com.plp.platform.auth.AuthProvider;
import com.plp.platform.auth.AuthProvider.Principal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Guards {@code /api/agent/**} (ADR-0002, task B0.2b): verifies the bearer
 * token via {@link AuthProvider} (JWKS-driven, {@code iss}/{@code aud}/
 * {@code exp} - see {@code auth.AuthConfig}), resolves the verified
 * principal to a local {@code agent} record via {@link AgentModuleApi}, and
 * enforces lifecycle status at this edge:
 *
 * <ul>
 *   <li>no/invalid/expired/wrong-iss/wrong-aud token -&gt; {@code 401}
 *   <li>{@link AgentStatus#DISABLED} -&gt; {@code 403 AGENT_DISABLED}
 *   <li>{@link AgentStatus#PENDING_APPROVAL} -&gt; allowed through (a
 *       pending agent may log in and use draft-only endpoints; the publish
 *       gate is enforced later, in the not-yet-built {@code listing}
 *       domain layer, per the ADR-0002 amendment)
 *   <li>{@link AgentStatus#ACTIVE} -&gt; allowed through
 * </ul>
 *
 * <p>On success, sets an {@link AgentAuthenticationToken} (principal =
 * {@link AgentPrincipal}) as the request's {@code Authentication} so
 * {@code SecurityConfig}'s {@code authorizeHttpRequests().authenticated()}
 * rule for {@code /api/agent/**} is satisfied and controllers can read it
 * via {@code @AuthenticationPrincipal}.
 *
 * <p>Only runs for {@code /api/agent/**} ({@link #shouldNotFilter}) - it
 * must never gate {@code /api/public/**} or {@code /actuator/health}, which
 * stay anonymous (module-boundaries.md).
 *
 * <p>Registered {@code addFilterBefore(AuthorizationFilter.class)} in
 * {@link SecurityConfig} - it runs, and either terminates the request
 * (401/403) or populates the {@code SecurityContext}, strictly before
 * Spring Security's own authorization decision is made.
 */
@Component
class AgentAuthenticationFilter extends OncePerRequestFilter {

    private static final RequestMatcher AGENT_API_MATCHER = new AntPathRequestMatcher("/api/agent/**");
    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthProvider authProvider;
    private final AgentModuleApi agentModuleApi;

    AgentAuthenticationFilter(AuthProvider authProvider, AgentModuleApi agentModuleApi) {
        this.authProvider = authProvider;
        this.agentModuleApi = agentModuleApi;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !AGENT_API_MATCHER.matches(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws IOException, ServletException {
        String bearerToken = extractBearerToken(request);
        Optional<Principal> principal = authProvider.verify(bearerToken);
        if (principal.isEmpty()) {
            writeError(response, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
            return;
        }

        AgentSummary agent = resolveAgent(principal.get());
        if (agent.status() == AgentStatus.DISABLED) {
            writeError(response, HttpStatus.FORBIDDEN, "AGENT_DISABLED");
            return;
        }

        SecurityContextHolder.getContext().setAuthentication(new AgentAuthenticationToken(new AgentPrincipal(principal.get(), agent)));
        filterChain.doFilter(request, response);
    }

    /**
     * {@code getByAuthSubject}-first, provisioning only on a miss (not on
     * every request): the common case is a returning, already-provisioned
     * agent, so this keeps steady-state traffic read-only against the
     * {@code agent} table. {@code provisionOnFirstLogin} is race-safe
     * (B0.2a) if two first requests for a brand-new subject arrive
     * concurrently.
     */
    private AgentSummary resolveAgent(Principal principal) {
        return agentModuleApi
                .getByAuthSubject(principal.authSubject())
                .orElseGet(() -> agentModuleApi.provisionOnFirstLogin(
                        principal.authSubject(), principal.email(), principal.name()));
    }

    private static String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private static void writeError(HttpServletResponse response, HttpStatus status, String code) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":\"" + code + "\"}");
    }
}
