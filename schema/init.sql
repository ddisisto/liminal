-- Liminal schema v1
-- Sessions, sequences, tokens, viewport events, annotations.
-- Sequences and tokens are immutable once written (VCS invariant).
-- Viewport events are append-only, the core L1 attention signal.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
    title       TEXT,
    metadata    TEXT  -- JSON blob for extensibility
);

CREATE TABLE IF NOT EXISTS sequences (
    id                  TEXT PRIMARY KEY,
    session_id          TEXT NOT NULL REFERENCES sessions(id),
    parent_sequence_id  TEXT,          -- NULL for root sequences
    fork_position       INTEGER,       -- token index in parent where branch diverges
    role                TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'kept', 'discarded')),
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sequences_session ON sequences(session_id);

CREATE TABLE IF NOT EXISTS tokens (
    sequence_id TEXT NOT NULL REFERENCES sequences(id),
    position    INTEGER NOT NULL,
    text        TEXT NOT NULL,
    logprob     REAL,       -- NULL for user-authored tokens
    entropy     REAL,       -- NULL for user-authored tokens
    surprisal   REAL,       -- NULL for user-authored tokens
    top_k       TEXT,       -- JSON array of {token, logprob} pairs, nullable
    PRIMARY KEY (sequence_id, position)
) WITHOUT ROWID;

-- Viewport events: the core L1 attention signal.
-- Each row records one continuous interval where a block was visible.
-- AFK gating: visibility pauses on blur/visibilitychange, so gaps are real.
CREATE TABLE IF NOT EXISTS viewport_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    visible_from TEXT NOT NULL,   -- ISO 8601 timestamp
    visible_to   TEXT NOT NULL,   -- ISO 8601 timestamp
    duration_ms  INTEGER NOT NULL, -- precomputed for convenience
    confidence   TEXT NOT NULL DEFAULT 'active' CHECK (confidence IN ('active', 'idle', 'uncertain'))
);

CREATE INDEX IF NOT EXISTS idx_viewport_session ON viewport_events(session_id);
CREATE INDEX IF NOT EXISTS idx_viewport_sequence ON viewport_events(sequence_id);

-- Annotations: Layer 2, user-deliberate marks. Included in schema but deferred.
CREATE TABLE IF NOT EXISTS annotations (
    id              TEXT PRIMARY KEY,
    sequence_id     TEXT NOT NULL REFERENCES sequences(id),
    start_position  INTEGER NOT NULL,
    end_position    INTEGER NOT NULL,
    label           TEXT NOT NULL,
    classification  TEXT,          -- optional structured tag
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
);
