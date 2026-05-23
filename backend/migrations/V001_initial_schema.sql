-- Initial Schema Migration (PostgreSQL)

-- Gyms
CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  country TEXT,
  owner_email TEXT NOT NULL,
  manager_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'owner')),
  first_login INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id)
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  qr_code_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'daily', 'b2b', 'walk_in')),
  current_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, email),
  UNIQUE (gym_id, qr_code_id)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL,
  included_services TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Member Subscriptions
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_daily NUMERIC(10, 2) NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Checkins
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  member_id TEXT,
  member_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'daily', 'b2b', 'walk_in')),
  service TEXT NOT NULL,
  amount NUMERIC(10, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Employers
CREATE TABLE IF NOT EXISTS employers (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, name)
);

-- Payments log
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  member_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription_signup', 'subscription_renewal', 'walk_in', 'daily')),
  service TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gym_id) REFERENCES gyms(id),
  UNIQUE (gym_id, code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkins_gym_timestamp ON checkins(gym_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_members_gym ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_gym ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_timestamp ON payments(gym_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_coupons_gym ON coupons(gym_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member_id ON member_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
