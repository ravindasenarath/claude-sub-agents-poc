package com.plp.platform;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Reusable Testcontainers Postgres harness for persistence tests.
 *
 * <p>Deliberately does not boot the Spring context: it stands up a real,
 * disposable PostgreSQL instance (matching {@code docker-compose.yml}'s
 * {@code postgres:16-alpine}), applies every versioned migration under
 * {@code src/main/resources/db/migration} with Flyway directly (the same
 * migrations {@code spring.flyway} runs in the real application), and
 * exposes a plain {@link JdbcTemplate} against it. Subclasses get a fully
 * migrated schema and can assert against it or exercise
 * {@code *.internal} JDBC implementations directly, without needing
 * {@code @SpringBootTest} or a real network-reachable database.
 *
 * <p>The container is a single static field on this shared base class, so
 * Testcontainers starts it once for the entire test JVM and every subclass
 * reuses the same running instance (rather than paying container startup
 * cost per test class); {@code migrateSchema()} re-running Flyway per
 * subclass is safe/idempotent (Flyway skips already-applied versions).
 * Because the database - and any rows in it - persists across all
 * subclasses for the whole run, tests must not assume an empty table and
 * should scope inserts/assertions to data they themselves own (e.g. a
 * unique {@code auth_subject} per test) rather than asserting on total row
 * counts.
 */
@Testcontainers
public abstract class AbstractPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("plp_test")
                    .withUsername("plp_test")
                    .withPassword("plp_test");

    protected static HikariDataSource dataSource;
    protected static JdbcTemplate jdbcTemplate;

    @BeforeAll
    static void migrateSchema() {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(POSTGRES.getJdbcUrl());
        hikariConfig.setUsername(POSTGRES.getUsername());
        hikariConfig.setPassword(POSTGRES.getPassword());
        hikariConfig.setPoolName("plp-testcontainers-pool");
        hikariConfig.setMaximumPoolSize(10);
        hikariConfig.setMinimumIdle(2);
        dataSource = new HikariDataSource(hikariConfig);
        jdbcTemplate = new JdbcTemplate(dataSource);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }
}
