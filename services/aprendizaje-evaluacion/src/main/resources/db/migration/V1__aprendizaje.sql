CREATE TABLE learning_modules (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    position INTEGER NOT NULL UNIQUE CHECK(position BETWEEN 1 AND 1000),
    published BOOLEAN NOT NULL
);
CREATE TABLE learning_lessons (
    id VARCHAR(100) PRIMARY KEY,
    module_id VARCHAR(100) NOT NULL REFERENCES learning_modules(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 1000),
    minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 120),
    UNIQUE(module_id,position)
);
CREATE TABLE learning_contents (
    id VARCHAR(100) PRIMARY KEY,
    lesson_id VARCHAR(100) NOT NULL REFERENCES learning_lessons(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    youtube_id VARCHAR(11) NOT NULL
);
CREATE TABLE learning_challenges (
    id VARCHAR(100) PRIMARY KEY,
    lesson_id VARCHAR(100) NOT NULL REFERENCES learning_lessons(id) ON DELETE RESTRICT,
    question TEXT NOT NULL,
    options JSONB NOT NULL CHECK(jsonb_typeof(options)='array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
    correct_index INTEGER NOT NULL CHECK(correct_index BETWEEN 0 AND 5),
    explanation TEXT NOT NULL,
    CHECK(correct_index < jsonb_array_length(options))
);
CREATE TABLE learning_attempts (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    challenge_id VARCHAR(100) NOT NULL REFERENCES learning_challenges(id) ON DELETE RESTRICT,
    answer INTEGER NOT NULL CHECK(answer BETWEEN 0 AND 5),
    score INTEGER NOT NULL CHECK(score IN (0,100)),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX learning_attempts_user ON learning_attempts(user_id,created_at DESC);
CREATE TABLE learning_progress (
    user_id VARCHAR(100) NOT NULL,
    lesson_id VARCHAR(100) NOT NULL REFERENCES learning_lessons(id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(user_id,lesson_id)
);
CREATE TABLE learning_achievements (
    user_id VARCHAR(100) NOT NULL,
    key VARCHAR(50) NOT NULL,
    earned_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(user_id,key)
);
CREATE TABLE learning_simulation_inbox (
    event_id UUID PRIMARY KEY,
    simulation_id VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- user_id is an external identity reference, never a cross-service foreign key.
CREATE TABLE learning_versions (user_id VARCHAR(100) PRIMARY KEY, version BIGINT NOT NULL CHECK(version>0));
CREATE TABLE learning_outbox (
    event_id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    aggregate_version BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DELIVERED','FAILED')),
    UNIQUE(user_id,aggregate_version)
);
