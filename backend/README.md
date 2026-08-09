# Property Listing Platform - Backend

Spring Boot 3 **modular monolith** (single deployable), scaffolded per
[`docs/architecture/ADR-0001-architecture-style-and-stack.md`](../docs/architecture/ADR-0001-architecture-style-and-stack.md)
and [`docs/architecture/module-boundaries.md`](../docs/architecture/module-boundaries.md).

Started as scaffolding only (task B0.1). Task B0.2a added the first real
schema/migration and persistence code: the `agent` table and its
provisioning port (`AgentModuleApi`) - see "Database migrations" below.
Listing CRUD, auth flows (JWT verification/`AuthProvider`), search, and
media upload are still not implemented; this structure and its
mechanically-enforced module boundary exist so those follow-up tasks have
a consistent place to land.

## Stack

- Java 21, Spring Boot 3.5.16 (Maven, wrapper included: `./mvnw`)
- `spring-boot-starter-web` - REST controllers (public-api / agent-api)
- `spring-boot-starter-actuator` - health check (`/actuator/health`)
- `spring-boot-starter-jdbc` + HikariCP + PostgreSQL driver - plain JDBC
  (no JPA/ORM; see "What's deliberately NOT here" below)
- Flyway (`flyway-core` + `flyway-database-postgresql`) - versioned SQL
  migrations, see "Database migrations" below
- ArchUnit (`archunit-junit5`) - mechanical enforcement of module boundaries
- Testcontainers (`junit-jupiter` + `postgresql`, test scope) - a real,
  disposable PostgreSQL for persistence tests (see "Testing" below)

## Module layout

```
com.plp.platform
├── auth/            shared AuthProvider seam (ADR-0002) - interface only
├── agent/
│   ├── api/         published interface (AgentModuleApi, AgentSummary,
│   │                AgentStatus - schema + provisioning port; B0.2a)
│   └── internal/    Agent row + JdbcAgentModuleApi (plain JDBC; B0.2a)
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
  surface,
- anything outside a module's `internal` package (or either HTTP surface)
  depends on JDBC/SQL types,
- anything in `search` - including `search.internal` - depends on JDBC/SQL
  types at all (search has no database access of its own; see the
  "Resolved" note below).

Most of these rules are still vacuously true for the modules that remain
scaffolding-only (`listing`, `media`, `search`) - they exist so that the
first real violation (a future PR that adds an entity in the wrong place,
or a controller that queries another module's repository) fails CI
immediately instead of depending on code review to catch it. `agent`
(B0.2a) is the first module with real code exercising these rules for
real: `JdbcAgentModuleApi`'s JDBC usage lives in `agent.internal` only,
and only `com.plp.platform.agent.api` types (`AgentModuleApi`,
`AgentSummary`, `AgentStatus`) are reachable from outside the module.

**Resolved: `search` has no direct database access.** `search` may not read
the `listing` table (or any table) directly - it must go through
`listing.api`'s `findPublished(ListingQuery)` query port. `listing.internal`
implements that port as one index-backed SQL statement filtering
`status = 'PUBLISHED'`; DB-native filtering and indexing for published
listings (ADR-0004) live in `listing.internal`, not in a separate
`search`-owned table/index path. This is mechanically enforced -
`ModuleBoundaryTest#searchModuleNeverDependsOnJdbcOrSql` forbids anything in
`search`, including `search.internal`, from depending on
`org.springframework.jdbc`, `javax.sql`, or `java.sql` at all, so `search`
issues no SQL of its own. See `module-boundaries.md` rule 6 and the
ADR-0004 amendment.

## Configuration

`src/main/resources/application.yml`:

- **Datasource / connection pool**: PostgreSQL via HikariCP
  (`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`/`DB_POOL_MAX_SIZE`
  env vars, sensible local defaults). `initialization-fail-timeout: -1` is
  kept (see the comment in `application.yml`) so the `test` profile's
  context-load smoke test can start without a live database; the real
  (default) profile still requires one at startup because Flyway does
  (below).
- **Flyway**: enabled by default (`spring.flyway.enabled: true`), migrating
  `classpath:db/migration` on startup. Disabled in the `test` profile
  (`application-test.yml`) - see "Database migrations" and "Testing" below.
- **Actuator**: `/actuator/health` and `/actuator/info` exposed.
- **Logging**: console pattern configured; `com.plp.platform` at `INFO`.

For local development, `docker-compose.yml` starts a matching PostgreSQL
16 instance:

```
docker compose up -d
```

## Database migrations

Schema changes are versioned SQL files managed by Flyway, applied
automatically on application startup (`spring.flyway`, `application.yml`).

**Convention**: `src/main/resources/db/migration/V<n>__<snake_case>.sql`

- `<n>` is the next integer version (`V1`, `V2`, `V3`, ...) - no gaps, no
  reuse.
- `<snake_case>` briefly names what the migration does (e.g. `V1__agent.sql`,
  not `V1__create_agent_table_with_status_column.sql`).
- Migrations are **forward-only**. Once a migration has been merged to
  `main` (i.e. it may have already run against someone's database, staging,
  or prod), it must never be edited - Flyway checksums applied migrations
  and will refuse to run if a previously-applied file's contents change. To
  correct or extend an already-merged migration, write a new one
  (`V2__...sql`) that alters the schema further; only edit a migration file
  in place while its PR is still open/unmerged.
- Enum-like columns (e.g. `agent.status`) use a `text` column with a
  `CHECK` constraint rather than a native Postgres `ENUM` type, so that
  adding a new allowed value later is a plain, transaction-safe migration
  (`ALTER TABLE ... DROP CONSTRAINT ...; ALTER TABLE ... ADD CONSTRAINT
  ...`) instead of running into Postgres's restrictions on using a value
  added via `ALTER TYPE ... ADD VALUE` within the same (Flyway-managed)
  transaction it was added in. See the comment in `V1__agent.sql`.

## What's deliberately NOT here (out of scope for this task)

- No JPA entities or Spring Data repositories - persistence stays plain
  JDBC (`JdbcTemplate` + hand-written row mappers) per module, in that
  module's `internal` package. `agent` (B0.2a) is the first module with a
  real table; `listing`/`media`/`search` schema/migrations remain future
  tasks.
- No Spring Security / JWT verification / `AuthProvider` implementation -
  that's the "auth integration" follow-up task (B0.2b, blocked on B0.2a).
  Only the `AuthProvider` interface seam (ADR-0002) is scaffolded, and
  nothing calls `AgentModuleApi#provisionOnFirstLogin` yet.
- No object-storage client (S3-compatible) wiring - that's the "object
  storage seam" follow-up task. Only the `media.api` package is reserved.
- No controllers in `publicapi`/`agentapi`, no listing CRUD, no search
  filtering, no image upload orchestration - all business logic beyond the
  `agent` schema/provisioning port is out of scope here.

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

(or `./mvnw verify`, which runs the same test phase - there is no separate
integration-test phase/plugin configured.)

Runs:

- the ArchUnit boundary rules,
- a smoke test that the Spring context (all modules + config) starts and
  the health endpoint responds (no live PostgreSQL required - the `test`
  profile disables Flyway and the actuator `db` health indicator; see
  `application-test.yml`), and
- persistence tests for the `agent` module (schema + `JdbcAgentModuleApi`)
  against a real, disposable PostgreSQL started via Testcontainers -
  **these require a working Docker (or compatible) daemon** to be
  reachable from wherever the tests run, including CI. They do not use
  `application.yml`/`application-test.yml` or a Spring context at all: see
  `AbstractPostgresIntegrationTest`, which applies every migration under
  `db/migration` with Flyway directly against the Testcontainers instance.
