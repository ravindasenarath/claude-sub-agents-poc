package com.plp.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Property Listing Platform (v1) backend.
 *
 * <p>This is a <b>modular monolith</b> (ADR-0001): a single deployable process,
 * internally partitioned into the modules described in
 * {@code docs/architecture/module-boundaries.md}:
 *
 * <ul>
 *   <li>{@code com.plp.platform.agent} - agent profile + identity linkage</li>
 *   <li>{@code com.plp.platform.listing} - listing lifecycle, ownership, status</li>
 *   <li>{@code com.plp.platform.media} - image upload orchestration, metadata</li>
 *   <li>{@code com.plp.platform.search} - public query/filter/sort over published listings</li>
 * </ul>
 *
 * <p>and two HTTP API surfaces:
 *
 * <ul>
 *   <li>{@code com.plp.platform.publicapi} - unauthenticated read (public visitors)</li>
 *   <li>{@code com.plp.platform.agentapi} - authenticated write (agents)</li>
 * </ul>
 *
 * <p>Cross-module access is only permitted through each module's {@code api}
 * subpackage; {@code internal} subpackages are implementation detail. This is
 * mechanically enforced by the ArchUnit rules in
 * {@code com.plp.platform.architecture.ModuleBoundaryTest} (test sources).
 */
@SpringBootApplication
public class PlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlatformApplication.class, args);
    }
}
