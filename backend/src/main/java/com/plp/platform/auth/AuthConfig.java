package com.plp.platform.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Builds the single, JWKS-backed {@link JwtDecoder} shared by
 * {@link JwtAuthProvider} (the {@link AuthProvider} implementation) and
 * {@code agentapi.SecurityConfig}'s Spring Security filter chain, so both
 * verify tokens the exact same way (signature + {@code iss} + {@code aud} +
 * {@code exp}, per ADR-0002 and task B0.2b's acceptance criteria).
 *
 * <p>{@code NimbusJwtDecoder.withJwkSetUri(...)} fetches/caches the JWKS
 * document lazily on first use - constructing this bean does not require
 * the issuer/mock issuer to be reachable at application startup (matching
 * this codebase's existing "don't require live infra at context-load time"
 * convention, see {@code application.yml}'s
 * {@code initialization-fail-timeout} comment for the datasource).
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
class AuthConfig {

    @Bean
    JwtDecoder jwtDecoder(AuthProperties properties) {
        NimbusJwtDecoder decoder =
                NimbusJwtDecoder.withJwkSetUri(properties.jwkSetUri()).build();

        Duration clockSkew = Duration.ofSeconds(properties.clockSkewSeconds());
        OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> validator =
                new DelegatingOAuth2TokenValidator<>(
                        new JwtTimestampValidator(clockSkew),
                        new JwtIssuerValidator(properties.issuerUri()),
                        new AudienceValidator(properties.audience()));
        decoder.setJwtValidator(validator);
        return decoder;
    }
}
