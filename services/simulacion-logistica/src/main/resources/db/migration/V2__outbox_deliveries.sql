CREATE TABLE simulation_outbox_deliveries (
    event_id UUID NOT NULL REFERENCES simulation_outbox(event_id) ON DELETE RESTRICT,
    consumer VARCHAR(100) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','FAILED')),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leased_until TIMESTAMPTZ,
    lease_token UUID,
    last_error VARCHAR(100),
    PRIMARY KEY (event_id, consumer)
);
CREATE INDEX simulation_deliveries_pending ON simulation_outbox_deliveries(next_attempt_at) WHERE status='PENDING';
