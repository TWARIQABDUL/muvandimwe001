-- Who did what, and when. Written by the API for every state-changing action so the
-- owner can trace a mistake (a doubled check-in, a doubled payment) back to a person.
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    gym_id TEXT,
    user_id TEXT,
    username TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_gym_created ON audit_logs(gym_id, created_at);

-- A walk-in/daily check-in writes a payment alongside it. Linking them lets the owner
-- remove both together when the check-in was entered twice.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkin_id TEXT;
