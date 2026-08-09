# Property Listing Platform - Backend

Spring Boot 3 **modular monolith** (single deployable), scaffolded per
[`docs/architecture/ADR-0001-architecture-style-and-stack.md`](../docs/architecture/ADR-0001-architecture-style-and-stack.md)
and [`docs/architecture/module-boundaries.md`](../docs/architecture/module-boundaries.md).

This is scaffolding only (task B0.1): no business logic (listing CRUD, auth
flows, search, media upload) is implemented yet. It exists so downstream
tasks (DB schema/migrations, auth integration, object storage seam, and the
feature tasks built on top of them) have a consistent structure and a
boundary rule that is enforced automatically, not just by convention.

## Stack

- Java 21, Spring Boot 3.5.16 (Maven, wrapper included: `./mvnw`)
- `spring-boot-starter-web` - REST controllers (public-api / agent-api)
- `spring-boot-starter-actuator` - health check (`/actuator/health`)
- `spring-boot-starter-jdbc` + HikariCP + PostgreSQL driver - connection pool
  only (no JPA/ORM yet; see "What's deliberately NOT here" below)
- ArchUnit (`archunit-junit5`) - mechanical enforcement of module boundaries

## Module layout

```
com.plp.platform
├── auth/            shared AuthProvider seam (ADR-0002) - interface only
├── agent/
│   ├── api/         published interface (AgentModuleApi - marker for now)
│   └── internal/    entities/repositories/mappers (not yet added)
├── listing/
│   ├── api/
│   └── internal/
├── media/
│   ├── api/
│   └── internal/
├── search/
│   ├── api/
│   └── internal/
├── publicapi/       unauthenticated read HTTP surface (no controllers yet)
└── agentapi/        authenticated write HTTP surface (no controllers yet)
```

Each business module (`agent`, `listing`, `media`, `search`) is split into:

- `api` - the module's **published interface**. Other modules and the two
  HTTP surfaces may only depend on classes here.
- `internal` - implementation detail (entities, Spring Data repositories,
  mappers). No code outside the module's own package may reference it.

This mirrors `docs/architecture/module-boundaries.md` rule 1: *"No module
reads or writes another module's tables directly - go through its
interface."*

## Boundary enforcement

`src/test/java/com/plp/platform/architecture/ModuleBoundaryTest.java` runs
as part of the normal test suite (`./mvnw test`) and mechanically fails the
build if:

- any module's `internal` package is referenced from outside that module,
- a module depends on another module in a direction the architecture
  doesn't allow (e.g. `agent`/`media` must not depend on any other business
  module; `listing` may only depend on `agent`/`media`'s `api` packages;
  `search` may only depend on `listing`'s `api` package),
- a business module depends on either HTTP surface (`publicapi`/`agentapi`),
- `publicapi`/`agentapi` reach into any module's `internal` package,
- the shared `auth` seam depends back on any business module or HTTP
  surface.

Because there is no real code in the modules yet, most of these rules are
currently vacuously true - they exist so that the first real violation (a
future PR that adds an entity in the wrong place, or a controller that
queries another module's repository) fails CI immediately instead of
depending on code review to catch it.

**Open question flagged for the tech lead / DB schema task:** the
`module-boundaries.md` component diagram shows `search` with its own direct
line to PostgreSQL, alongside `agent`/`listing`/`media`, which reads as "the
`search` module may read the `listing` table directly for index-backed
filtering" rather than "search must call `listing`'s Java API per row" -
that's a reasonable read-side exception to the "no cross-module DB access"
rule for performance (ADR-0004), but it isn't spelled out as an explicit
exception. `ModuleBoundaryTest` currently only restricts `search`'s
*Java-level* dependency to `listing.api`; it does not (and structurally
cannot, until entities exist) constrain which physical tables a future
`search.internal` repository queries. Recommend confirming this explicitly
(e.g. an ADR-0004 amendment) before the DB schema/migrations task implements
`search`'s persistence layer.

## Configuration

`src/main/resources/application.yml`:

- **Datasource / connection pool**: PostgreSQL via HikariCP
  (`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`/`DB_POOL_MAX_SIZE`
  env vars, sensible local defaults). `initialization-fail-timeout: -1` lets
  the app start even before a database exists - there's no schema yet, and
  the actuator health check will honestly report the DB as down until
  there's a real database and the DB schema/migrations task lands.
- **Actuator**: `/actuator/health` and `/actuator/info` exposed.
- **Logging**: console pattern configured; `com.plp.platform` at `INFO`.

For local development, `docker-compose.yml` starts a matching PostgreSQL
16 instance:

```
docker compose up -d
```

## What's deliberately NOT here (out of scope for this task)

- No JPA entities, Spring Data repositories, or migrations (Flyway/Liquibase)
  - that's the "DB schema/migrations" follow-up task. `data-model.md`'s
    entities live in each module's (currently empty) `internal` package.
- No Spring Security / JWT verification / `AuthProvider` implementation -
  that's the "auth integration" follow-up task. Only the `AuthProvider`
  interface seam (ADR-0002) is scaffolded.
- No object-storage client (S3-compatible) wiring - that's the "object
  storage seam" follow-up task. Only the `media.api` package is reserved.
- No controllers in `publicapi`/`agentapi`, no listing CRUD, no search
  filtering, no image upload orchestration - all business logic is out of
  scope for this scaffolding task.

## Running

```
./mvnw spring-boot:run
```

```
curl http://localhost:8080/actuator/health
```

## Testing

```
./mvnw test
```

Runs the ArchUnit boundary rules and a smoke test that the Spring context
(all modules + config) starts and the health endpoint responds. No live
PostgreSQL is required for the test suite.
