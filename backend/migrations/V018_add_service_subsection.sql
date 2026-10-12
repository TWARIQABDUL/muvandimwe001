-- A service can sit inside another section's report rather than heading its own.
-- Abana belongs under Gym: Gym keeps its counted format and Abana is listed
-- beneath it, instead of Abana opening a section of its own.
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_subsection INTEGER DEFAULT 0;
