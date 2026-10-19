CREATE TABLE simulation_scenarios (
    id VARCHAR(100) PRIMARY KEY,
    parameters JSONB NOT NULL CHECK (jsonb_typeof(parameters) = 'object')
);
CREATE TABLE simulation_runs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(100) NOT NULL REFERENCES simulation_scenarios(id) ON DELETE RESTRICT,
    snapshot JSONB NOT NULL,
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    day INTEGER NOT NULL DEFAULT 0 CHECK (day BETWEEN 0 AND 30),
    created_at TIMESTAMPTZ NOT NULL,
    CHECK (jsonb_typeof(decisions) = 'array' AND jsonb_array_length(decisions) = day)
);
CREATE INDEX simulation_runs_user_created ON simulation_runs(user_id, created_at DESC);
CREATE TABLE simulation_results (
    id VARCHAR(100) PRIMARY KEY,
    simulation_id VARCHAR(100) NOT NULL UNIQUE REFERENCES simulation_runs(id) ON DELETE RESTRICT,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    profit DOUBLE PRECISION NOT NULL,
    service_rate DOUBLE PRECISION NOT NULL CHECK (service_rate BETWEEN 0 AND 1),
    feedback TEXT NOT NULL,
    timeline JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE simulation_outbox (
    event_id UUID PRIMARY KEY,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED'))
);
CREATE INDEX simulation_outbox_pending ON simulation_outbox(created_at) WHERE status = 'PENDING';
