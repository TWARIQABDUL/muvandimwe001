CREATE TABLE IF NOT EXISTS closing_notes (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    report_date DATE NOT NULL,
    note TEXT,
    momo_balance NUMERIC(10, 2),
    cash_balance NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE (gym_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_closing_notes_gym_date ON closing_notes(gym_id, report_date);
