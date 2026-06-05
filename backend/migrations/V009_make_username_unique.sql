-- Drop the old email constraint if it still exists from the rename
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Ensure username is strictly unique
ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);
