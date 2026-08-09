/**
 * Published interface of the {@code agent} module.
 *
 * <p>Other modules and the {@code publicapi}/{@code agentapi} surfaces may
 * depend on types in this package only. Per module-boundaries.md:
 *
 * <ul>
 *   <li>{@link com.plp.platform.agent.api.AgentModuleApi#getByAuthSubject} -
 *       resolve the local agent record for a verified
 *       {@link com.plp.platform.auth.AuthProvider.Principal}</li>
 *   <li>{@link com.plp.platform.agent.api.AgentModuleApi#provisionOnFirstLogin} -
 *       idempotently create the local agent row the first time a new
 *       subject authenticates (ADR-0002)</li>
 * </ul>
 *
 * <p>{@code getPublicContact(agentId)} (name + contact for listing detail
 * pages, FR15) is not yet part of this interface - it is deferred to
 * whichever future task first needs it (listing detail read path), to keep
 * this task (B0.2a: schema + provisioning port) scoped to what B0.2b (auth
 * integration) and the future listing-status gate need.
 *
 * <p>{@link com.plp.platform.agent.api.AgentModuleApi} is implemented by
 * {@code agent.internal.JdbcAgentModuleApi} (plain JDBC, no JPA/Hibernate).
 */
package com.plp.platform.agent.api;
