ALTER TABLE checkins ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE payments ADD COLUMN user_id TEXT REFERENCES users(id);
