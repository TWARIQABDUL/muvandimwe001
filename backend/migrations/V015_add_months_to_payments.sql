-- Number of months bought, so the report can print "New:60k (for 2 month)"
ALTER TABLE payments ADD COLUMN IF NOT EXISTS months INTEGER;
