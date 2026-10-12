-- An employer grants a pool of services (employer_services); an individual
-- partner member may be entitled to only some of them, e.g. sauna only.
-- NULL means the member inherits the employer's whole pool, which is how
-- every partner member registered before this behaved.
ALTER TABLE members ADD COLUMN IF NOT EXISTS allowed_services TEXT;
