-- Track which services each institution (employer)'s members are allowed to use
CREATE TABLE IF NOT EXISTS employer_services (
    employer_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employer_id, service_id),
    FOREIGN KEY (employer_id) REFERENCES employers(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE INDEX IF NOT EXISTS idx_employer_services_service ON employer_services(service_id);
