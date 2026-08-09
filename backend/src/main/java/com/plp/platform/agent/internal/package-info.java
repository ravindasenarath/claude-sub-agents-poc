/**
 * Implementation detail of the {@code agent} module: the {@code agent}
 * table mapping and its {@link com.plp.platform.agent.api.AgentModuleApi}
 * implementation.
 *
 * <p>Nothing outside {@code com.plp.platform.agent} may reference classes in
 * this package - enforced by
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (ArchUnit).
 * Persistence types (plain JDBC {@link com.plp.platform.agent.internal.Agent}
 * row / {@link org.springframework.jdbc.core.JdbcTemplate} usage - no JPA)
 * belong here, not in {@code api}.
 *
 * <p>{@link com.plp.platform.agent.internal.JdbcAgentModuleApi} implements
 * {@link com.plp.platform.agent.api.AgentModuleApi} against the
 * {@code agent} table created by
 * {@code src/main/resources/db/migration/V1__agent.sql} (see
 * {@code docs/architecture/data-model.md}).
 */
package com.plp.platform.agent.internal;
