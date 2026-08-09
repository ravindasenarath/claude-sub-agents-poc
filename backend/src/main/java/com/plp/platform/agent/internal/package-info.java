/**
 * Implementation detail of the {@code agent} module: entities, Spring Data
 * repositories, mappers.
 *
 * <p>Nothing outside {@code com.plp.platform.agent} may reference classes in
 * this package - enforced by
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (ArchUnit).
 * Persistence types (e.g. JPA entities) belong here, not in {@code api}.
 *
 * <p>Empty in this scaffolding task; the DB schema/migrations follow-up task
 * adds the {@code agent} table mapping described in
 * {@code docs/architecture/data-model.md}.
 */
package com.plp.platform.agent.internal;
