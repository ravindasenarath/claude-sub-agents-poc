/**
 * {@code agent} module (module-boundaries.md).
 *
 * <p>Owns the agent profile record (FR14) and its linkage to the managed
 * identity provider's subject id ({@code auth_subject}, ADR-0002). Depends
 * on {@link com.plp.platform.auth.AuthProvider} only; no dependency on any
 * other business module.
 *
 * <p>Published interface: {@link com.plp.platform.agent.api}. Implementation
 * detail (entities, repositories, mappers): {@link com.plp.platform.agent.internal},
 * which no other module may reference directly.
 */
package com.plp.platform.agent;
