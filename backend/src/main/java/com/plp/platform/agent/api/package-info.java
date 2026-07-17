/**
 * Published interface of the {@code agent} module.
 *
 * <p>Other modules and the {@code publicapi}/{@code agentapi} surfaces may
 * depend on types in this package only. Per module-boundaries.md, the
 * intended operations here are (to be implemented in a follow-up task):
 *
 * <ul>
 *   <li>{@code getAgentByAuthSubject} - resolve the local agent record for a
 *       verified {@link com.plp.platform.auth.AuthProvider.Principal}</li>
 *   <li>{@code getPublicContact(agentId)} - name + contact for listing detail
 *       pages (FR15)</li>
 *   <li>{@code provisionOnFirstLogin} - create the local agent row the first
 *       time a new subject authenticates (ADR-0002)</li>
 * </ul>
 *
 * <p>{@link com.plp.platform.agent.api.AgentModuleApi} is a scaffolding
 * marker only; it deliberately has no methods yet so this task stays
 * scoped to structure, not behaviour.
 */
package com.plp.platform.agent.api;
