-- Projection versions are independent from the sequence of individual learning facts.
CREATE TABLE learning_progress_snapshots (
 user_id VARCHAR(100) PRIMARY KEY,
 aggregate_version BIGINT NOT NULL CHECK(aggregate_version>0),
 event_id UUID NOT NULL UNIQUE,
 payload_hash VARCHAR(64) NOT NULL,
 payload JSONB NOT NULL,
 covered_fact_version BIGINT NOT NULL DEFAULT 0,
 refresh_after TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE learning_progress_outbox (
 event_id UUID PRIMARY KEY,
 user_id VARCHAR(100) NOT NULL,
 aggregate_version BIGINT NOT NULL CHECK(aggregate_version>0),
 payload JSONB NOT NULL,
 covered_fact_version BIGINT NOT NULL DEFAULT 0,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DELIVERED','FAILED')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 leased_until TIMESTAMPTZ,
 lease_token UUID,
 last_error VARCHAR(40),
 UNIQUE(user_id,aggregate_version)
);
CREATE INDEX learning_progress_pending ON learning_progress_outbox(next_attempt_at) WHERE status='PENDING';
CREATE TABLE learning_progress_refresh_queue (
 user_id VARCHAR(100) PRIMARY KEY,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error VARCHAR(80)
);
