package com.plp.platform.architecture;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Mechanical enforcement of the module-boundary rules in
 * {@code docs/architecture/module-boundaries.md}.
 *
 * <p>These rules encode the seam that keeps a future service split cheap
 * (ADR-0001): modules communicate only through their published {@code api}
 * package, never by reaching into another module's {@code internal}
 * (implementation/persistence) package, and the HTTP surfaces
 * ({@code publicapi}/{@code agentapi}) never bypass a module's published
 * interface either.
 *
 * <p>The business modules currently contain only scaffolding
 * (package-info + a marker interface), so most rules are vacuously true
 * today. They are here so that CI fails the moment real code violates a
 * boundary, rather than relying on code review to catch it.
 */
class ModuleBoundaryTest {

    private static final String ROOT_PACKAGE = "com.plp.platform";

    private static final com.tngtech.archunit.core.domain.JavaClasses CLASSES =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages(ROOT_PACKAGE);

    // ---------------------------------------------------------------
    // Rule 1 (module-boundaries.md): no module reads/writes another
    // module's internals directly - only its published `api` package.
    // ---------------------------------------------------------------

    @Test
    void agentInternalsAreOnlyAccessedWithinTheAgentModule() {
        rule("..agent.internal..", "..agent..").check(CLASSES);
    }

    @Test
    void listingInternalsAreOnlyAccessedWithinTheListingModule() {
        rule("..listing.internal..", "..listing..").check(CLASSES);
    }

    @Test
    void mediaInternalsAreOnlyAccessedWithinTheMediaModule() {
        rule("..media.internal..", "..media..").check(CLASSES);
    }

    @Test
    void searchInternalsAreOnlyAccessedWithinTheSearchModule() {
        rule("..search.internal..", "..search..").check(CLASSES);
    }

    private static ArchRule rule(String internalPackage, String owningModulePackage) {
        // onlyHaveDependentClassesThat (rather than onlyBeAccessed()) is
        // deliberate: onlyBeAccessed() only inspects method/constructor
        // calls and field access, so a class outside the module that merely
        // holds an `internal` type as a field/parameter/return type (a
        // type-level dependency, no member access) would slip through.
        // onlyHaveDependentClassesThat() checks all dependency kinds.
        return classes()
                .that().resideInAPackage(internalPackage)
                .should().onlyHaveDependentClassesThat()
                .resideInAnyPackage(owningModulePackage);
    }

    // ---------------------------------------------------------------
    // Module dependency direction, per the module-boundaries.md
    // component diagram: agent <- listing -> search, media is a leaf,
    // and no business module may depend "upward" into an API surface.
    // ---------------------------------------------------------------

    @Test
    void agentModuleDoesNotDependOnOtherBusinessModulesOrApiSurfaces() {
        noClasses()
                .that().resideInAPackage("..agent..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..listing..", "..media..", "..search..", "..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    @Test
    void mediaModuleDoesNotDependOnOtherBusinessModulesOrApiSurfaces() {
        noClasses()
                .that().resideInAPackage("..media..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..agent..", "..listing..", "..search..", "..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    @Test
    void listingModuleOnlyDependsOnAgentApiAndMediaApi() {
        noClasses()
                .that().resideInAPackage("..listing..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..agent.internal..", "..media.internal..", "..search..", "..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    @Test
    void searchModuleOnlyDependsOnListingApi() {
        noClasses()
                .that().resideInAPackage("..search..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..agent..", "..media..", "..listing.internal..", "..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    // ---------------------------------------------------------------
    // API surfaces: read/write HTTP layers depend on modules, never the
    // other way around, and never reach into `internal` packages.
    // ---------------------------------------------------------------

    @Test
    void noBusinessModuleDependsOnAnApiSurface() {
        noClasses()
                .that().resideInAnyPackage("..agent..", "..listing..", "..media..", "..search..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    @Test
    void publicApiNeverReachesIntoAnyModuleInternals() {
        noClasses()
                .that().resideInAPackage("..publicapi..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(
                        "..agent.internal..", "..listing.internal..", "..media.internal..", "..search.internal..")
                .check(CLASSES);
    }

    @Test
    void agentApiNeverReachesIntoAnyModuleInternals() {
        noClasses()
                .that().resideInAPackage("..agentapi..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(
                        "..agent.internal..", "..listing.internal..", "..media.internal..", "..search.internal..")
                .check(CLASSES);
    }

    // ---------------------------------------------------------------
    // Shared auth seam (ADR-0002): everyone may depend on it, it must
    // depend on nothing of ours.
    // ---------------------------------------------------------------

    @Test
    void authSeamDoesNotDependOnAnyBusinessModuleOrApiSurface() {
        noClasses()
                .that().resideInAPackage("..auth..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(
                        "..agent..", "..listing..", "..media..", "..search..", "..publicapi..", "..agentapi..")
                .check(CLASSES);
    }

    // ---------------------------------------------------------------
    // JDBC confinement: DB access must stay inside each module's
    // `internal` layer. This is the mechanical enforcement point ahead
    // of the DB schema/migrations task - nothing in a module's `api`
    // package or either HTTP surface may talk to JDBC/SQL directly.
    // ---------------------------------------------------------------

    @Test
    void onlyModuleInternalsMayDependOnJdbcOrSql() {
        noClasses()
                .that().resideOutsideOfPackage("..internal..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("org.springframework.jdbc..", "javax.sql..", "java.sql..")
                .check(CLASSES);
    }

    @Test
    void publicApiAndAgentApiNeverDependOnJdbcOrSql() {
        noClasses()
                .that().resideInAnyPackage("..publicapi..", "..agentapi..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("org.springframework.jdbc..", "javax.sql..", "java.sql..")
                .check(CLASSES);
    }
}
