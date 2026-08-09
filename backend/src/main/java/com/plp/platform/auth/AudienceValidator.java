package com.plp.platform.auth;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Rejects a JWT whose {@code aud} claim does not contain the expected
 * audience ({@link AuthProperties#audience()}).
 *
 * <p>Spring Security's {@code NimbusJwtDecoder} validates signature,
 * {@code exp}/{@code nbf} timing, and can validate {@code iss} out of the
 * box, but has no built-in {@code aud} validator - this fills that gap
 * (task B0.2b acceptance criteria: wrong-{@code aud} tokens must be
 * rejected with 401).
 */
final class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID_AUDIENCE =
            new OAuth2Error("invalid_token", "required audience is missing", null);

    private final String requiredAudience;

    AudienceValidator(String requiredAudience) {
        this.requiredAudience = requiredAudience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (jwt.getAudience() != null && jwt.getAudience().contains(requiredAudience)) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(INVALID_AUDIENCE);
    }
}
