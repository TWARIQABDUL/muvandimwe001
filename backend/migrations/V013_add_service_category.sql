-- Group services into report sections (e.g. relax / swedish / deep tissue -> massage)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 100;

-- Existing services are their own section
UPDATE services SET category = name WHERE category IS NULL OR category = '';

CREATE INDEX IF NOT EXISTS idx_services_gym_category ON services(gym_id, category);
