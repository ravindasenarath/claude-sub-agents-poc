package com.plp.platform.agent.api;

/**
 * Lifecycle status of a local {@code agent} record (data-model.md,
 * {@code agent.status}). Sole source of truth for an agent's authorization
 * state - not derived from any other flag/column.
 *
 * <p>Enum constant names match the {@code agent.status} CHECK-constrained
 * text values exactly (see {@code V1__agent.sql}); the JDBC implementation
 * maps between them with {@link #name()}/{@link #valueOf(String)}, not an
 * ordinal or a separate lookup table.
 */
public enum AgentStatus {

    /**
     * Default status on self-service signup (first login). The agent may
     * log in and save Draft listings, but may not publish until approved.
     * Approval is a manual ops/DB action in v1 (no admin UI).
     */
    PENDING_APPROVAL,

    /** Approved; may publish listings. */
    ACTIVE,

    /** Disabled by ops; may not log in to perform write actions. */
    DISABLED
}
