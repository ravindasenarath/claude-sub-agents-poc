package com.plp.platform.agent.internal;

import com.plp.platform.agent.api.AgentStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Full {@code agent} table row (data-model.md), internal to this module.
 *
 * <p>Only {@link com.plp.platform.agent.api.AgentSummary} - a small
 * projection of {@code id}/{@code status} - is published outside
 * {@code agent}. {@code agency_name}/{@code phone}/{@code profile_photo_key}
 * are nullable: profile completion happens later via profile edit, not at
 * provisioning time (no forced onboarding).
 */
record Agent(
        UUID id,
        String authSubject,
        String name,
        String agencyName,
        String phone,
        String contactEmail,
        String profilePhotoKey,
        AgentStatus status,
        OffsetDateTime approvedAt,
        OffsetDateTime disabledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
