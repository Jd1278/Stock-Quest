CREATE TABLE people_users (
 id VARCHAR(100) PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 document VARCHAR(30) NOT NULL UNIQUE,
 email VARCHAR(191) NOT NULL UNIQUE,
 company VARCHAR(100) NOT NULL,
 phone VARCHAR(30),
 password_hash TEXT NOT NULL,
 role VARCHAR(30) NOT NULL DEFAULT 'APRENDIZ' CHECK(role IN ('APRENDIZ','LIDER','GESTOR_PEDAGOGICO')),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 token_version INTEGER NOT NULL DEFAULT 0 CHECK(token_version>=0),
 created_at TIMESTAMPTZ NOT NULL,
 leader_id VARCHAR(100) REFERENCES people_users(id) ON DELETE SET NULL
);
CREATE INDEX people_users_leader ON people_users(leader_id,active);
CREATE TABLE people_groups (
 id VARCHAR(100) PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 leader_id VARCHAR(100) NOT NULL REFERENCES people_users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX people_groups_leader ON people_groups(leader_id);
CREATE TABLE people_memberships (
 group_id VARCHAR(100) NOT NULL REFERENCES people_groups(id) ON DELETE CASCADE,
 user_id VARCHAR(100) NOT NULL REFERENCES people_users(id) ON DELETE CASCADE,
 PRIMARY KEY(group_id,user_id)
);
CREATE INDEX people_memberships_user ON people_memberships(user_id);
-- No learning/simulation tables or cross-service foreign keys belong here.
CREATE TABLE people_versions (aggregate_id VARCHAR(100) PRIMARY KEY, version BIGINT NOT NULL CHECK(version>0));
CREATE TABLE people_outbox (
 event_id UUID PRIMARY KEY,
 aggregate_id VARCHAR(100) NOT NULL,
 aggregate_version BIGINT NOT NULL,
 event_type VARCHAR(100) NOT NULL,
 payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DELIVERED','FAILED')),
 UNIQUE(aggregate_id,aggregate_version)
);
