BEGIN;

-- 1. Drop the existing CHECK constraint
-- (PostgreSQL auto-names it table_column_check if you didn't explicitly name it)
ALTER TABLE coupons 
DROP CONSTRAINT IF EXISTS coupons_discount_percent_check;

-- 2. Change the column type from INTEGER to NUMERIC(5,2) 
-- This allows up to 3 digits before the decimal and 2 after (e.g., 100.00)
ALTER TABLE coupons 
ALTER COLUMN discount_percent TYPE NUMERIC(5, 2) USING discount_percent::NUMERIC;

-- 3. Add the new CHECK constraint to allow decimals
-- Changing 'BETWEEN 1 AND 100' to '> 0 AND <= 100' so 0.5% is also valid
ALTER TABLE coupons 
ADD CONSTRAINT coupons_discount_percent_check 
CHECK (discount_percent > 0 AND discount_percent <= 100);

COMMIT;