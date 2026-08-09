package com.plp.platform.agentapi;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Single Spring Security configuration for the whole application
 * (module-boundaries.md, ADR-0002 amendment "token transport (BFF)").
 *
 * <p>Lives in {@code agentapi} - the only HTTP surface that needs
 * authentication - rather than a separate top-level package, because
 * introducing {@code spring-boot-starter-oauth2-resource-server} pulls in
 * {@code spring-boot-starter-security}, which auto-secures <b>every</b>
 * endpoint by default the moment it is on the classpath. This single
 * {@link SecurityFilterChain} is therefore the one place that both (a)
 * un-secures {@code public-api}/actuator back to their intended anonymous
 * access and (b) secures {@code agent-api}, so the two rules can never
 * drift out of sync in two different files.
 *
 * <ul>
 *   <li>{@code /api/public/**}, {@code /actuator/**}: anonymous
 *       (module-boundaries.md: public reads need no auth, NFR1).
 *   <li>{@code /api/agent/**}: requires the {@link AgentAuthenticationFilter}
 *       to have set an authenticated principal (401/403 otherwise - see
 *       that class).
 *   <li>anything else: denied by default.
 * </ul>
 *
 * <p><b>CORS.</b> Per the amended module-boundaries.md, {@code agent-api} is
 * called only by the Agent Web Next.js server (a BFF proxy) - never by
 * browser JavaScript - so it must carry <b>no</b> CORS configuration at
 * all. {@link #corsConfigurationSource(String)} registers an allowed origin
 * for {@code /api/public/**} only; {@code getCorsConfiguration(request)}
 * returns {@code null} for every other path (including {@code /api/agent/**}),
 * which is Spring's documented signal to the CORS filter to apply no CORS
 * handling whatsoever to that request - no {@code Access-Control-*}
 * headers are added, and no preflight is answered. Getting this backwards
 * (registering a catch-all {@code "/**"} pattern, or applying CORS to
 * {@code agent-api}) would silently reopen the credential-exposure risk
 * the BFF proxy exists to close - see
 * {@code AgentApiSecurityIntegrationTest#agentApiSendsNoCorsHeaderAtAllEvenForACrossOriginRequest}
 * and {@code #agentApiDoesNotAnswerACorsPreflightRequest}.
 */
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AgentAuthenticationFilter agentAuthenticationFilter,
            CorsConfigurationSource corsConfigurationSource)
            throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/public/**", "/actuator/**")
                        .permitAll()
                        .requestMatchers("/api/agent/**")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .addFilterBefore(agentAuthenticationFilter, AuthorizationFilter.class);
        return http.build();
    }

    /**
     * CORS for {@code public-api} only, restricted to the web origin, with
     * credentials disabled (module-boundaries.md: "needs CORS for the web
     * origin, with credentials disabled" - public reads never carry a
     * cookie/token). {@code PUBLIC_WEB_ORIGIN} defaults to the Next.js dev
     * server (matches {@code web/.env.example}'s local-dev convention).
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${public-api.cors.allowed-origin:http://localhost:3000}") String allowedOrigin) {
        CorsConfiguration publicApiCors = new CorsConfiguration();
        publicApiCors.setAllowedOrigins(List.of(allowedOrigin));
        publicApiCors.setAllowedMethods(List.of("GET"));
        publicApiCors.setAllowedHeaders(List.of("*"));
        publicApiCors.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/public/**", publicApiCors);
        // Deliberately nothing registered for "/api/agent/**" (or any other
        // pattern) - see class javadoc.
        return source;
    }
}
