-- Derived data only. Learning owns every source field of the report.
CREATE TABLE people_progress_inbox (
 event_id UUID PRIMARY KEY,
 user_id VARCHAR(100) NOT NULL REFERENCES people_users(id) ON DELETE CASCADE,
 aggregate_version BIGINT NOT NULL CHECK(aggregate_version>0),
 payload_hash VARCHAR(64) NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,aggregate_version)
);
CREATE TABLE people_progress_projections (
 user_id VARCHAR(100) PRIMARY KEY REFERENCES people_users(id) ON DELETE CASCADE,
 aggregate_version BIGINT NOT NULL CHECK(aggregate_version>0),
 event_id UUID NOT NULL,
 payload JSONB NOT NULL,
 projected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
