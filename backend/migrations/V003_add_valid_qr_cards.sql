CREATE TABLE IF NOT EXISTS valid_qr_cards (
    id VARCHAR(255) PRIMARY KEY,
    gym_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'unassigned',
    assigned_member_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id)
);
