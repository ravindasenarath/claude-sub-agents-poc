# Property Listing Platform - Backend

Spring Boot 3 **modular monolith** (single deployable), scaffolded per
[`docs/architecture/ADR-0001-architecture-style-and-stack.md`](../docs/architecture/ADR-0001-architecture-style-and-stack.md)
and [`docs/architecture/module-boundaries.md`](../docs/architecture/module-boundaries.md).

Started as scaffolding only (task B0.1). Task B0.2a added the first real
schema/migration and persistence code: the `agent` table and its
provisioning port (`AgentModuleApi`). Task B0.2b (this) added real
authentication: JWKS-driven JWT verification (`AuthProvider`), the
`agent-api` guard (`SecurityConfig`, `AgentAuthenticationFilter`), and the
first endpoint, `GET /api/agent/me` - see "Auth" below. Listing CRUD,
search, and media upload are still not implemented; this structure and its
mechanically-enforced module boundary exist so those follow-up tasks have
a consistent place to land.

## Stack

- Java 21, Spring Boot 3.5.16 (Maven, wrapper included: `./mvnw`)
- `spring-boot-starter-web` - REST controllers (public-api / agent-api)
- `spring-boot-starter-actuator` - health check (`/actuator/health`)
- `spring-boot-starter-oauth2-resource-server` - JWKS-driven JWT
  verification (pulls in `spring-boot-starter-security`; see "Auth" below)
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
├── auth/            shared AuthProvider seam (ADR-0002): JwtAuthProvider,
│                    AuthConfig (JwtDecoder bean), AuthProperties - B0.2b
├── agent/
│   ├── api/         published interface (AgentModuleApi, AgentSummary,
│   │                AgentProfile, AgentStatus - B0.2a + B0.2b)
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
├── publicapi/       unauthenticated read HTTP surface (no controllers yet;
│                    permitAll + CORS wired in agentapi.SecurityConfig)
└── agentapi/        authenticated write HTTP surface - SecurityConfig
                     (the app's single Spring Security config),
                     AgentAuthenticationFilter, GET /api/agent/me - B0.2b
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
- any OAuth2/JWT library type (Spring Security's `oauth2`/`jwt` packages,
  or the underlying Nimbus JOSE+JWT library) appears in `agent`, `listing`,
  `media`, or `search` (B0.2b) - `agentapi`/`publicapi` are exempt, since
  they legitimately wire Spring Security itself,
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
16 instance (and a mock OIDC issuer - see "Auth" below):

```
docker compose up -d
```

## Auth

Agent authentication is delegated to a managed identity provider
(ADR-0002), still undecided at the time of writing. `agent-api` therefore
verifies plain, standard OIDC/JWT bearer tokens - JWKS-driven signature
verification plus `iss`/`aud`/`exp` claim checks (`auth.AuthConfig`,
`auth.JwtAuthProvider`) - rather than any vendor SDK, so swapping the
concrete provider later only means changing config, not code.

**Config** (`auth.*` in `application.yml`, env-var driven like the `DB_*`
datasource vars):

| Property | Env var | Default | Meaning |
|---|---|---|---|
| `auth.issuer-uri` | `AUTH_ISSUER_URI` | `http://localhost:8081/default` | expected `iss` claim (plain match, not OIDC discovery - see `AuthProperties` javadoc for why) |
| `auth.audience` | `AUTH_AUDIENCE` | `plp-agent-api` | expected `aud` claim (token must include it) |
| `auth.jwk-set-uri` | `AUTH_JWK_SET_URI` | `http://localhost:8081/default/jwks` | JWKS document URL used for signature verification |
| `auth.clock-skew-seconds` | `AUTH_CLOCK_SKEW_SECONDS` | `60` | allowed `exp`/`nbf` clock skew; access tokens are assumed short-lived (~15 min) - refreshing is the frontend BFF's job, not this service's |

**Request flow** (`agentapi.AgentAuthenticationFilter`, guarding
`/api/agent/**` only): verify the bearer token via `AuthProvider` -> resolve
the verified subject to a local `agent` row via `AgentModuleApi`
(`getByAuthSubject` first, provisioning only on a miss - not on every
request, since the common case is a returning agent) -> enforce lifecycle
status:

- no/invalid/expired/wrong-`iss`/wrong-`aud` token -> `401`
- `agent.status = DISABLED` -> `403 {"code": "AGENT_DISABLED"}`
- `agent.status = PENDING_APPROVAL` -> allowed through (may use draft-only
  endpoints; the publish gate is enforced later, in the `listing` domain
  layer, per the ADR-0002 amendment - nothing to enforce at this edge)
- `agent.status = ACTIVE` -> allowed through

**Local dev / CI mock issuer.** The concrete identity provider is still
undecided, so nothing here depends on a live vendor:

- **Local dev** (manual, interactive login): `docker-compose.yml`'s
  `mock-oidc` service (`ghcr.io/navikt/mock-oauth2-server`) serves a real
  JWKS endpoint at the config defaults above. Open
  `http://localhost:8081/default/debugger` to mint a token (set the
  audience claim to match `AUTH_AUDIENCE`).
- **Tests/CI** (`./mvnw verify`, no Docker networking beyond what
  Testcontainers already needs for Postgres): `support.MockOidcIssuer`
  generates an RSA keypair in-process and serves its JWKS document from an
  embedded loopback HTTP server, so `AuthConfig`'s real
  `NimbusJwtDecoder.withJwkSetUri` path is exercised end-to-end without any
  external dependency. See `AgentApiSecurityIntegrationTest` (no DB
  required - JWT verification outcomes, the public/actuator regression,
  CORS) and `AgentApiEndpointIntegrationTest` (Testcontainers Postgres
  required - principal -> agent resolution/provisioning, lifecycle status
  enforcement, `GET /api/agent/me`'s response shape).

**CORS.** Per module-boundaries.md's amended "Agent token transport (BFF)"
section, `agent-api` is called only by the Agent Web Next.js server (a BFF
proxy), never by browser JavaScript - so it carries **no CORS
configuration at all**. Only `public-api` gets CORS, restricted to
`PUBLIC_WEB_ORIGIN` (default `http://localhost:3000`), credentials
disabled. Both are wired in `agentapi.SecurityConfig` - see its javadoc for
why introducing Spring Security means this one file also has to un-secure
`public-api`/actuator back to anonymous, not just secure `agent-api`.

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
- No object-storage client (S3-compatible) wiring - that's the "object
  storage seam" follow-up task. Only the `media.api` package is reserved.
- No listing CRUD, no search filtering, no image upload orchestration - all
  business logic beyond the `agent` schema/provisioning port and
  `GET /api/agent/me` (B0.2b) is out of scope here.
- No agent profile *editing* endpoint (FR14) and no `getPublicContact`
  (FR15, public listing detail) - both explicitly deferred past B0.2b.
- No ownership/authorization (NFR2) checks - no listings exist yet; that's
  the `listing` module's job once it exists (module-boundaries.md rule 3).
- No role/admin modeling (requirements section 2, stretch, out of v1 core
  scope).

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

- the ArchUnit boundary rules (including, since B0.2b, that no OAuth2/JWT
  library type leaks into `agent`/`listing`/`media`/`search` -
  `ModuleBoundaryTest#authLibraryTypesStayOutOfBusinessModules`),
- a smoke test that the Spring context (all modules + config) starts and
  the health endpoint responds (no live PostgreSQL required - the `test`
  profile disables Flyway and the actuator `db` health indicator; see
  `application-test.yml`),
- `agentapi.AgentApiSecurityIntegrationTest` (B0.2b): JWT verification
  outcomes (missing/malformed/bad-signature/expired/wrong-issuer/wrong-
  audience -> 401), the public-api/actuator-health regression, and the
  agent-api/public-api CORS asymmetry - boots the Spring context but needs
  no live database, so it runs without Docker,
- persistence tests for the `agent` module (schema + `JdbcAgentModuleApi`,
  B0.2a) and `agentapi.AgentApiEndpointIntegrationTest` (B0.2b: `GET
  /api/agent/me`'s happy path, provisioning-on-first-request, `DISABLED`/
  `PENDING_APPROVAL`/`ACTIVE` status handling) against a real, disposable
  PostgreSQL started via Testcontainers - **these require a working Docker
  (or compatible) daemon** to be reachable from wherever the tests run,
  including CI. The `agent.internal` ones do not use
  `application.yml`/`application-test.yml` or a Spring context at all: see
  `AbstractPostgresIntegrationTest`, which applies every migration under
  `db/migration` with Flyway directly against the Testcontainers instance;
  `AgentApiEndpointIntegrationTest` boots a full `@SpringBootTest` against
  its own Testcontainers Postgres instead, since it needs the controller
  and security filter chain wired up too.
