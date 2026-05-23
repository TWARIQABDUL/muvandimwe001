-- Gyms (track all gyms, even though MVP = 1)
CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  country TEXT,
  owner_email TEXT NOT NULL,
  manager_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (manager + owner accounts per gym)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'owner')),
  first_login INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- Members (gym_id scoped)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  qr_code_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'daily', 'b2b', 'walk_in')),
  current_subscription_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, email),
  UNIQUE (gym_id, qr_code_id)
);

-- Subscriptions (subscription tiers per gym)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  included_services TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Member Subscriptions (active/expired subscription records)
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  next_renewal_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired')),
  is_card INTEGER DEFAULT 0,
  remaining_taps INTEGER DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Services (gym, sauna, pool, etc. per gym)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_daily DECIMAL(10, 2) NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Check-ins (every check-in record)
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  member_id TEXT,
  member_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'daily', 'b2b', 'walk_in')),
  service TEXT NOT NULL,
  amount DECIMAL(10, 2),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_checkins_gym_timestamp ON checkins(gym_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_members_gym ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_gym ON users(gym_id);

-- Employers (optional - for B2B subscriptions)
CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Payments log (tracks all dynamic income streams)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  member_id TEXT, -- NULL for walk-ins
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription_signup', 'subscription_renewal', 'walk_in', 'daily')),
  service TEXT NOT NULL, -- e.g. "gym", "sauna,pool"
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Gym Coupon Codes
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, code)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_checkins_gym_timestamp ON checkins(gym_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_members_gym ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_gym ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_timestamp ON payments(gym_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_coupons_gym ON coupons(gym_id);

