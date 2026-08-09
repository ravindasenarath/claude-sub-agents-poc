-- V1: agent table (data-model.md `agent` entity, ADR-0002 authorization
-- source of truth).
--
-- Two stakeholder decisions shape this schema (B0.2a):
--   1. Agent signup is self-service with pending approval: a row is
--      provisioned on first login (see agent.internal.JdbcAgentModuleApi)
--      with status = 'PENDING_APPROVAL'. Agents can log in and save Draft
--      listings immediately; publishing requires approval, which is a
--      manual ops/DB action in v1 (no admin UI).
--   2. `status` is a single lifecycle column added now (rather than as a
--      later migration) since this migration is being authored anyway.
--
-- `status` is a CHECK-constrained text column rather than a native
-- Postgres ENUM type: adding a value to a Postgres enum type
-- (`ALTER TYPE ... ADD VALUE`) cannot run inside a transaction on older
-- PostgreSQL, and even where it can, the new value cannot be used in the
-- same transaction that added it - both awkward under Flyway, which runs
-- each versioned migration in a transaction by default. Extending a CHECK
-- constraint (drop + re-add, in a later migration) is a plain,
-- transaction-safe change, at the cost of one extra migration per new
-- value. This is the convention for enum-like columns in this codebase
-- going forward, not just this table.
--
-- `id` has no DB-side default: the application always supplies a
-- pre-generated UUID (java.util.UUID.randomUUID()) on insert, keeping ID
-- generation in application code rather than depending on a Postgres
-- extension (pgcrypto/uuid-ossp) for gen_random_uuid()/uuid_generate_v4().

CREATE TABLE agent (
    id                 uuid        NOT NULL,
    auth_subject       text        NOT NULL,
    name               text        NOT NULL,
    agency_name        text,
    phone              text,
    contact_email      text        NOT NULL,
    profile_photo_key  text,
    status             text        NOT NULL DEFAULT 'PENDING_APPROVAL',
    approved_at        timestamptz,
    disabled_at        timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT agent_pkey PRIMARY KEY (id),
    CONSTRAINT agent_auth_subject_key UNIQUE (auth_subject),
    CONSTRAINT agent_status_check CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'DISABLED'))
);

-- "my listings"-style lookups and the future listing-module publish gate
-- both key off status; index it alongside the unique auth_subject lookup
-- Postgres already gets for free from the UNIQUE constraint above.
CREATE INDEX agent_status_idx ON agent (status);

COMMENT ON TABLE agent IS
    'Local agent profile + authorization record (ADR-0002). Keyed by the '
    'managed IdP''s stable auth_subject; provisioned on first login.';
COMMENT ON COLUMN agent.status IS
    'Lifecycle status, sole source of truth: PENDING_APPROVAL (default, '
    'self-service signup awaiting manual approval) -> ACTIVE (approved, '
    'may publish listings) -> DISABLED. See agent_status_check.';
